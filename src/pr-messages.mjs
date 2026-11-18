const coordinator = "https://github.com/lapismd/dependency-automation";
const profile = "https://github.com/lapismd/.github";
const sha = (value) => /^[a-f0-9]{40}$/.test(value ?? "");
const publicRepo = (value) =>
  /^[A-Za-z0-9_.-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(value ?? "");

// Renovate templates prBodyNotes: escape braces as well as Markdown/HTML.
function text(value, limit = 180) {
  const input = String(value ?? "unknown").replace(
    /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,
    " ",
  );
  let result = "";
  for (const c of input.slice(0, limit)) {
    const escaped = /[&<>\\`*_{}\[\]()|!#]/.test(c)
      ? `&#${c.charCodeAt(0)};`
      : c;
    if (result.length + escaped.length > limit) return result + "…";
    result += escaped;
  }
  return result + (input.length > limit ? "…" : "");
}
export function scopedContextSummary(node) {
  const scope = node.scopedAdmission;
  if (!scope) return "";
  const updates = scope.deferredUpdates ?? [],
    holds = scope.deferredHolds ?? [],
    waits = scope.deferredWaits ?? [];
  return `Scope: **root SDK development only**. Deferred outside this PR: ${updates.length} update(s)${
    updates.length
      ? ` (${updates
          .slice(0, 3)
          .map((u) => text(u.name, 100))
          .join(", ")}${updates.length > 3 ? ", more in the inventory" : ""})`
      : ""
  }, ${holds.length} frozen prerequisite hold(s), ${waits.length} publication/upstream wait(s). These constraints remain held for every other dependency; scoped eligibility is not full-repository acceptance.`;
}
function revision(repository, value) {
  return publicRepo(repository) && sha(value)
    ? `[${repository}@${value.slice(0, 12)}](https://github.com/${repository}/commit/${value})`
    : "revision unavailable";
}
function timestamp(value) {
  return typeof value === "string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
    ? value
    : "timestamp unavailable";
}
function section(kind, body) {
  return `<!-- lapis-${kind}-context:start -->\n${body}\n<!-- lapis-${kind}-context:end -->`;
}
function updateSection(body, kind, next, legacy) {
  if (typeof body !== "string" || Buffer.byteLength(body) > 60000)
    throw Error("Invalid or oversized PR description; reconcile manually");
  const start = `<!-- lapis-${kind}-context:start -->`,
    end = `<!-- lapis-${kind}-context:end -->`;
  if (
    typeof next !== "string" ||
    !next.startsWith(start + "\n") ||
    !next.endsWith("\n" + end) ||
    next.split(start).length !== 2 ||
    next.split(end).length !== 2
  )
    throw Error("Invalid replacement Lapis context");
  const starts = body.split(start).length - 1,
    ends = body.split(end).length - 1;
  let updated;
  if (starts || ends) {
    if (starts !== 1 || ends !== 1 || body.indexOf(end) < body.indexOf(start))
      throw Error("Ambiguous Lapis context markers; reconcile manually");
    updated =
      body.slice(0, body.indexOf(start)) +
      next +
      body.slice(body.indexOf(end) + end.length);
  } else {
    const matches = legacy ? [...body.matchAll(legacy)] : [];
    if (matches.length > 1)
      throw Error("Ambiguous legacy Lapis context; reconcile manually");
    if (matches.length) {
      const match = matches[0],
        offset = match.index + match[1].length;
      updated =
        body.slice(0, offset) + next + body.slice(offset + match[2].length);
    } else updated = body ? body + "\n\n" + next : next;
  }
  if (Buffer.byteLength(updated) > 60000)
    throw Error("Enriched PR description exceeds safe size");
  return updated;
}

export const legacyDependencyNote =
  "First-party npm updates only. Runtime and peer manifest changes include release intent. Specification checks are exempt for the trusted dependency bot; functional checks remain required. Compatible updates auto-merge only after CI succeeds and repository merge rules permit it. Major and 0.x minor updates remain draft PRs for manual review. Publication retains existing operator approval.";

export function updateDependencyBody(body, notes) {
  const escaped = legacyDependencyNote.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return updateSection(
    body,
    "dependency",
    notes,
    new RegExp(`(^|\\n\\n)(${escaped})(?=\\n\\n|$)`, "g"),
  );
}

export function dependencyNotes(repo, graph) {
  if (
    (repo.visibility && repo.visibility !== "public") ||
    !publicRepo(repo.repository)
  )
    return section(
      "dependency",
      "### Lapis dependency context\n\nPublic source evidence unavailable; automation remains held for review.",
    );
  const lines = [
    "### Lapis dependency context",
    "",
    `Source: ${revision(repo.repository, repo.sourceSha)}.`,
    "",
  ];
  const paths = [...new Set(repo.paths ?? [])];
  lines.push(
    `Discovered manifest scope: ${
      paths
        .slice(0, 6)
        .map((p) => text(p))
        .join(", ") || "unavailable"
    }${paths.length > 6 ? `; ${paths.length - 6} more paths in the inventory` : ""}.`,
  );
  const sourceHolds = [
    ...(repo.holdReason ? [repo.holdReason] : []),
    ...(repo.nonPortable ?? []),
    ...(repo.missingChangesets ? ["Changesets onboarding required"] : []),
  ];
  if (sourceHolds.length)
    lines.push(
      `Source constraints: ${sourceHolds
        .slice(0, 3)
        .map((h) => text(h))
        .join(
          "; ",
        )}${sourceHolds.length > 3 ? "; more constraints in the inventory" : ""}.`,
    );
  if (graph.coverage?.length)
    lines.push(
      `Inventory coverage gaps: ${graph.coverage.length}; unknown sources remain held.`,
    );
  const report = graph.waveAdmission,
    node = report?.nodes?.find((n) => n.repository === repo.repository);
  if (node && node.sourceSha === repo.sourceSha && sha(repo.sourceSha)) {
    lines.push(
      "",
      `Wave observation: ${timestamp(report.observedAt)}; policy ${revision("lapismd/dependency-automation", report.policyRevision)}; admission **${text(node.status, 30)}**.`,
      `Source CI at this observation: **${text(node.acceptance?.state, 30)}** (${text(node.acceptance?.reason)}).`,
      ...(node.scopedAdmission ? [scopedContextSummary(node)] : []),
      "",
      "Repository scan candidates (the native package table above defines this PR's actual diff):",
      "",
      "| Package / manifest | Proposed range | Compatibility / release intent |",
      "| --- | --- | --- |",
    );
    for (const u of (node.updates ?? []).slice(0, 6))
      lines.push(
        `| ${text(u.name, 100)} / ${text(u.path, 120)} (${text(u.type, 30)}) | ${text(u.range, 60)} → ${text(u.targetRange, 60)} | ${text(u.compatibility, 30)}; ${u.releaseIntent ? `patch intent for ${text(u.releaseIntent, 100)}` : "no public package release intent"} |`,
      );
    if (!node.updates?.length) lines.push("| No candidates recorded | — | — |");
    if (node.updates?.length > 6)
      lines.push(
        `\n${node.updates.length - 6} additional scan candidate(s) are recorded in the inventory.`,
      );
    const holds = [
      ...(node.holds ?? []),
      ...(node.scopedAdmission?.deferredHolds ?? []),
      ...(node.waits ?? []).map(
        (w) => `${w.package ?? "upstream"}: ${w.reason}`,
      ),
      ...(node.scopedAdmission?.deferredWaits ?? []).map(
        (w) => `${w.package ?? "upstream"}: ${w.reason}`,
      ),
      ...(node.branchHolds ?? []).map(
        (h) => `${h.branch ?? "branch"}: ${h.reason}`,
      ),
    ];
    lines.push(
      "",
      holds.length
        ? `Observed holds/waits (may concern another PR family): ${holds
            .slice(0, 4)
            .map((h) => text(h))
            .join(
              "; ",
            )}${holds.length > 4 ? `; ${holds.length - 4} more in the wave report` : ""}.`
        : "No holds recorded for this repository at that observation; execution revalidates source and ownership.",
    );
  } else
    lines.push(
      "",
      report
        ? "Stale or missing wave evidence for this exact source; no wave/CI qualification is claimed here."
        : "Flat-mode scan: wave evidence and its timestamp were not captured; no wave/CI qualification is claimed here.",
    );
  const prs =
    node?.sourceSha === repo.sourceSha && repo.evidence?.sha === repo.sourceSha
      ? (repo.evidence?.prs ?? []).filter(
          (pr) =>
            sha(pr.head?.sha) &&
            Number.isSafeInteger(pr.number) &&
            pr.number > 0,
        )
      : [];
  for (const pr of prs.slice(0, 3))
    lines.push(
      "",
      `Observed [PR #${pr.number} checks](https://github.com/${repo.repository}/pull/${pr.number}/checks) at ${revision(repo.repository, pr.head.sha)}: **${text(pr.qualification?.state, 30)}**; based on observed source: ${pr.basedOnCurrentSource === true ? "yes" : "unproven"}.`,
    );
  lines.push(
    "",
    "A new or regenerated head requires its own CI. Compatible updates may auto-merge only after current-head checks and repository rules pass. Major and 0.x minor updates remain manual compatibility drafts. Runtime/peer changes carry source-owned release intent; dev-only changes do not imply publication. Trusted-bot spec exemptions do not waive functional checks or publication approval.",
    "",
    `The native rebase/retry checkbox below is processed on the **next eligible coordinator run**. It cannot override held sources, manual-repair ownership, current-head CI or repository protections. [Coordinator runs/manual dispatch](${coordinator}/actions/workflows/reconcile.yml) · [Wave holds and recovery](${coordinator}/blob/main/docs/wave-pilot.md).`,
  );
  return section("dependency", lines.join("\n"));
}

export function profileNotes({
  before,
  candidate,
  sourceSha,
  candidateSha,
  now,
}) {
  if (
    !sha(sourceSha) ||
    !sha(candidateSha) ||
    timestamp(now) === "timestamp unavailable"
  )
    throw Error("Profile context requires exact revisions and timestamp");
  const originals = before.split("\n"),
    changed = [];
  let changedCells = 0;
  candidate.split("\n").forEach((line, i) => {
    if (!line.startsWith("|")) return;
    const cells = line.split("|").map((c) => c.trim()),
      old = originals[i].split("|").map((c) => c.trim());
    if (cells[3] === old[3]) return;
    changedCells++;
    const statuses = old[3].split("<br>");
    cells[3].split("<br>").forEach((status, index) => {
      if (status !== statuses[index])
        changed.push({
          row: cells[1].match(/github\.com\/lapismd\/([^/)]+)/)?.[1] ?? "row",
          before: statuses[index] ?? "unavailable",
          after: status,
        });
    });
  });
  const lines = [
    "### Lapis profile context",
    "",
    `${changedCells} npm-status cell${changedCells === 1 ? "" : "s"} changed in the public organization profile (${changed.length} package status changes). Prepared at ${now} from public npm metadata; this is a validation timestamp, not a registry publication time.`,
    "",
    `Source: ${revision("lapismd/.github", sourceSha)}. Candidate: ${revision("lapismd/.github", candidateSha)}.`,
    "",
    "| Repository row | Before | After |",
    "| --- | --- | --- |",
  ];
  const status = (cell) =>
    text(
      cell
        .replaceAll("<br>", "; ")
        .replace(
          /\[(@[a-z0-9._-]+\/[a-z0-9._-]+)\]\(https:\/\/www\.npmjs\.com\/package\/[^)]+\)/g,
          "$1",
        )
        .replaceAll("**", ""),
      220,
    );
  for (const row of changed.slice(0, 8))
    lines.push(
      `| ${text(row.row, 70)} | ${status(row.before)} | ${status(row.after)} |`,
    );
  if (changed.length > 8)
    lines.push(
      `\n${changed.length - 8} more package status changes are visible in the candidate diff.`,
    );
  const packages = [
    ...new Set(
      changed.flatMap((row) =>
        [...row.after.matchAll(/@[a-z0-9._-]+\/[a-z0-9._-]+/g)]
          .map((m) => m[0])
          .filter((name) => name.length <= 214),
      ),
    ),
  ];
  if (packages.length)
    lines.push(
      "",
      `Public npm package pages: ${packages
        .slice(0, 6)
        .map((name) => `[${name}](https://www.npmjs.com/package/${name})`)
        .join(
          ", ",
        )}${packages.length > 6 ? "; remaining packages are linked in the profile diff" : ""}.`,
    );
  lines.push(
    "",
    `Validated: exact source revision, configured public npm-cell grammar/order/count, unchanged surrounding profile text and bot-owned branch history. [Source generator](${profile}/blob/${sourceSha}/scripts/update-npm-status.mjs) · [Configured packages](${profile}/blob/${sourceSha}/profile/packages.json) · [Exact candidate diff](${profile}/compare/${sourceSha}...${candidateSha}).`,
    "",
    "Ordinary candidate CI and maintainer review remain required. This message does not claim the candidate checks passed; the coordinator App starts normal CI, and publication credentials and repository merge policy remain unchanged.",
    "",
    `[Review current checks](${profile}/actions?query=branch%3Aautomation%2Fnpm-status-refresh) · [Refresh workflow/manual dispatch](${coordinator}/actions/workflows/profile-refresh.yml). If source, ownership or validation is held, repair it before dispatch; identical pending candidates make no writes. No package publication is performed by this profile refresh.`,
  );
  return section("profile", lines.join("\n"));
}

export function updateProfileBody(body, notes) {
  return updateSection(
    body,
    "profile",
    notes,
    /(^|\n\n)(Generated from public npm metadata using source [a-f0-9]{40}\. The coordinator App starts ordinary CI; publication credentials are unchanged\.)(?=\n\n|$)/g,
  );
}
