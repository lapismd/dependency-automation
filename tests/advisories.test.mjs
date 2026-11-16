import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateAdvisories,
  validateAdvisoryPolicy,
} from "../src/advisories.mjs";

const sourceSha = "a".repeat(40),
  lockSha256 = "b".repeat(64);
const now = "2026-11-15T00:00:00.000Z";
const finding = {
  github_advisory_id: "GHSA-abcd-1234-5678",
  module_name: "leaf",
  severity: "low",
  vulnerable_versions: "<=1.0.0",
  patched_versions: "<0.0.0",
  findings: [{ version: "1.0.0", paths: [".>tool>leaf"] }],
};
const audit = (advisories = { 1: finding }) => ({
  advisories,
  muted: [],
  metadata: {
    vulnerabilities: {
      info: 0,
      low: Object.values(advisories).reduce((n, a) => n + a.findings.length, 0),
      moderate: 0,
      high: 0,
      critical: 0,
    },
  },
});
const binding = {
  sourceSha,
  lockSha256,
  now,
  registry: { leaf: { versions: { "1.0.0": {} } } },
};
const approval = {
  advisory: finding.github_advisory_id,
  package: "leaf",
  version: "1.0.0",
  path: ".>tool>leaf",
  severity: "low",
  sourceSha,
  lockSha256,
  approvedAt: "2026-11-14T00:00:00.000Z",
  expiresAt: "2026-11-20T00:00:00.000Z",
  review: "https://github.com/lapismd/dependency-automation/pull/123",
};
const policy = (approvals = []) => ({
  schemaVersion: 1,
  maxApprovalDays: 30,
  approvals,
});

test("empty approval authority blocks real findings and permits complete clean audits", () => {
  assert.equal(evaluateAdvisories(audit(), policy(), binding).allowed, false);
  assert.equal(evaluateAdvisories(audit({}), policy(), binding).allowed, true);
  assert.deepEqual(validateAdvisoryPolicy(policy()).approvals, []);
});
test("only exact approved unexpired source and lock bindings pass", () => {
  assert.equal(
    evaluateAdvisories(audit(), policy([approval]), binding).allowed,
    true,
  );
  for (const key of [
    "advisory",
    "package",
    "version",
    "path",
    "severity",
    "sourceSha",
    "lockSha256",
  ]) {
    const changed = {
      ...approval,
      [key]:
        key === "sourceSha"
          ? "c".repeat(40)
          : key === "lockSha256"
            ? "c".repeat(64)
            : key === "severity"
              ? "moderate"
              : key === "version"
                ? "1.0.1"
                : key === "advisory"
                  ? "GHSA-abcd-1234-9999"
                  : key === "path"
                    ? ".>other>leaf"
                    : "other",
    };
    assert.equal(
      evaluateAdvisories(audit(), policy([changed]), binding).allowed,
      false,
      key,
    );
  }
  for (const expiresAt of [now, "2026-11-14T00:00:00.000Z"])
    assert.equal(
      evaluateAdvisories(
        audit(),
        policy([
          { ...approval, approvedAt: "2026-11-13T00:00:00.000Z", expiresAt },
        ]),
        binding,
      ).allowed,
      false,
    );
});
test("known published fixes, additional paths and missing registry proof reject", () => {
  const newer = evaluateAdvisories(audit(), policy([approval]), {
    ...binding,
    registry: { leaf: { versions: { "1.0.0": {}, "2.0.0": {} } } },
  });
  assert.equal(newer.findings[0].reason, "known-published-fix");
  const patched = structuredClone(finding);
  patched.patched_versions = ">=2.0.0";
  assert.equal(
    evaluateAdvisories(audit({ 1: patched }), policy([approval]), {
      ...binding,
      registry: { leaf: { versions: { "1.0.0": {}, "2.0.0": {} } } },
    }).allowed,
    false,
  );
  assert.equal(
    evaluateAdvisories(audit(), policy([approval]), {
      ...binding,
      registry: {},
    }).allowed,
    false,
  );
  const extra = structuredClone(finding);
  extra.findings[0].paths.push(".>second>leaf");
  assert.equal(
    evaluateAdvisories(audit({ 1: extra }), policy([approval]), binding)
      .allowed,
    false,
  );
});
test("incomplete, suppressed and inconsistent audit evidence fails closed", () => {
  for (const raw of [
    {},
    { ...audit(), error: "failure" },
    { ...audit(), muted: [123] },
    { ...audit(), metadata: { vulnerabilities: { low: 0 } } },
  ])
    assert.throws(() => evaluateAdvisories(raw, policy(), binding), /audit/i);
  assert.throws(
    () =>
      validateAdvisoryPolicy(
        policy([{ ...approval, expiresAt: "2027-01-01T00:00:00.000Z" }]),
      ),
    /approval/i,
  );
  assert.throws(
    () => validateAdvisoryPolicy(policy([approval, approval])),
    /approval/i,
  );
});
test("fixed or disappeared findings require stale approval retirement", () => {
  const result = evaluateAdvisories(audit({}), policy([approval]), binding);
  assert.equal(result.allowed, false);
  assert.equal(result.cleanup.length, 1);
  assert.equal(result.cleanup[0].reason, "retire-stale-approval");
});
