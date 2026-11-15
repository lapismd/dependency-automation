import semver from "semver";

const sha = /^[a-f0-9]{40}$/;
const digest = /^[a-f0-9]{64}$/;
const levels = ["info", "low", "moderate", "high", "critical"];
const exactKeys = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => keys.includes(key));
const approvalKeys = [
  "advisory",
  "package",
  "version",
  "path",
  "severity",
  "sourceSha",
  "lockSha256",
  "approvedAt",
  "expiresAt",
  "review",
];
const timestamp = (value) =>
  typeof value === "string" &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;
const identity = (value) =>
  JSON.stringify([
    value.advisory,
    value.package,
    value.version,
    value.path,
    value.severity,
    value.sourceSha,
    value.lockSha256,
  ]);

export function validateAdvisoryPolicy(policy) {
  if (
    !exactKeys(policy, ["schemaVersion", "maxApprovalDays", "approvals"]) ||
    policy.schemaVersion !== 1 ||
    !Number.isInteger(policy.maxApprovalDays) ||
    policy.maxApprovalDays < 1 ||
    policy.maxApprovalDays > 30 ||
    !Array.isArray(policy.approvals)
  )
    throw Error("Invalid advisory approval policy");
  const seen = new Set();
  for (const entry of policy.approvals) {
    if (
      !exactKeys(entry, approvalKeys) ||
      !/^GHSA-[\w-]+$/.test(entry.advisory ?? "") ||
      !/^(?:@[\w.-]+\/)?[\w.-]+$/.test(entry.package ?? "") ||
      !semver.valid(entry.version) ||
      !/^\.>(?:[\w@./-]+>)*[\w@./-]+$/.test(entry.path ?? "") ||
      !levels.includes(entry.severity) ||
      !sha.test(entry.sourceSha) ||
      !digest.test(entry.lockSha256) ||
      !timestamp(entry.approvedAt) ||
      !timestamp(entry.expiresAt) ||
      Date.parse(entry.expiresAt) <= Date.parse(entry.approvedAt) ||
      Date.parse(entry.expiresAt) - Date.parse(entry.approvedAt) >
        policy.maxApprovalDays * 86400000 ||
      !/^https:\/\/github\.com\/lapismd\/dependency-automation\/pull\/\d+$/.test(
        entry.review ?? "",
      ) ||
      seen.has(identity(entry))
    )
      throw Error("Invalid or duplicate advisory approval");
    seen.add(identity(entry));
  }
  return policy;
}

/** Accept only complete pnpm legacy JSON audit evidence; never serialize audit prose. */
export function auditFindings(audit) {
  if (
    !audit ||
    audit.error ||
    !audit.advisories ||
    Array.isArray(audit.advisories) ||
    !Array.isArray(audit.muted) ||
    audit.muted.length ||
    !levels.every(
      (level) =>
        Number.isSafeInteger(audit.metadata?.vulnerabilities?.[level]) &&
        audit.metadata.vulnerabilities[level] >= 0,
    )
  )
    throw Error("Incomplete or suppressed audit evidence");
  const counts = Object.fromEntries(levels.map((level) => [level, 0])),
    findings = [];
  for (const advisory of Object.values(audit.advisories)) {
    if (
      !/^GHSA-[\w-]+$/.test(advisory.github_advisory_id ?? "") ||
      !/^(?:@[\w.-]+\/)?[\w.-]+$/.test(advisory.module_name ?? "") ||
      !levels.includes(advisory.severity) ||
      !semver.validRange(advisory.vulnerable_versions) ||
      !semver.validRange(advisory.patched_versions) ||
      !Array.isArray(advisory.findings) ||
      !advisory.findings.length
    )
      throw Error("Unsupported audit advisory");
    for (const affected of advisory.findings) {
      if (
        !semver.valid(affected.version) ||
        !Array.isArray(affected.paths) ||
        !affected.paths.length
      )
        throw Error("Unsupported audit finding");
      counts[advisory.severity]++;
      for (const path of affected.paths) {
        if (!/^\.>(?:[\w@./-]+>)*[\w@./-]+$/.test(path))
          throw Error("Unsupported audit dependency path");
        findings.push({
          advisory: advisory.github_advisory_id,
          package: advisory.module_name,
          version: affected.version,
          path,
          severity: advisory.severity,
          vulnerable: advisory.vulnerable_versions,
          patched: advisory.patched_versions,
        });
      }
    }
  }
  if (
    levels.some(
      (level) => counts[level] !== audit.metadata.vulnerabilities[level],
    )
  )
    throw Error("Inconsistent audit vulnerability counts");
  return findings;
}

export function evaluateAdvisories(
  audit,
  policy,
  { sourceSha, lockSha256, registry, now = new Date().toISOString() },
) {
  validateAdvisoryPolicy(policy);
  if (!sha.test(sourceSha) || !digest.test(lockSha256) || !timestamp(now))
    throw Error("Invalid audit source binding");
  const matched = new Set();
  const findings = auditFindings(audit).map((finding) => {
    const versions = Object.keys(
      registry?.[finding.package]?.versions ?? {},
    ).filter((v) => semver.valid(v) && !semver.prerelease(v));
    const knownFix = versions
      .filter(
        (v) =>
          semver.gt(v, finding.version) &&
          (!semver.satisfies(v, finding.vulnerable) ||
            semver.satisfies(v, finding.patched)),
      )
      .sort(semver.compare)[0];
    const entry = { ...finding, sourceSha, lockSha256 };
    const approved = policy.approvals.find(
      (candidate) => identity(candidate) === identity(entry),
    );
    if (approved) matched.add(identity(approved));
    const reason = !versions.includes(finding.version)
      ? "fix-metadata-unavailable"
      : knownFix
        ? "known-published-fix"
        : !approved
          ? "unapproved-finding"
          : Date.parse(approved.approvedAt) > Date.parse(now) ||
              Date.parse(approved.expiresAt) <= Date.parse(now)
            ? "approval-expired-or-not-yet-valid"
            : "exact-approved-finding";
    return {
      ...finding,
      reason,
      ...(knownFix ? { fixedVersion: knownFix } : {}),
      approved: reason === "exact-approved-finding",
    };
  });
  const cleanup = policy.approvals
    .filter((entry) => !matched.has(identity(entry)))
    .map(({ advisory, package: pkg, version, path }) => ({
      advisory,
      package: pkg,
      version,
      path,
      reason: "retire-stale-approval",
    }));
  return {
    schemaVersion: 1,
    sourceSha,
    lockSha256,
    checkedAt: now,
    allowed: findings.every((f) => f.approved) && !cleanup.length,
    findings,
    cleanup,
  };
}
