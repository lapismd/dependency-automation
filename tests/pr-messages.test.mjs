import assert from "node:assert/strict";
import test from "node:test";
import { repositoryConfig } from "../src/renovate.mjs";
import { compile } from "renovate/dist/util/template/index.js";
import {
  dependencyNotes,
  updateDependencyBody,
  legacyDependencyNote,
  profileNotes,
  updateProfileBody,
} from "../src/pr-messages.mjs";

const source = "a".repeat(40),
  policy = "b".repeat(40),
  head = "c".repeat(40);
const repo = {
  repository: "lapismd/lapis-notes",
  visibility: "public",
  sourceSha: source,
  paths: ["package.json", "packages/api/package.json"],
  manifests: [],
  evidence: {
    sha: source,
    prs: [
      {
        number: 126,
        head: { sha: head },
        qualification: { state: "qualified", reason: "current CI passed" },
        basedOnCurrentSource: true,
      },
    ],
  },
};
const graph = {
  packages: [
    { name: "@lapismd/design-core", repository: "lapismd/design-core" },
  ],
  available: {},
  cycles: [],
  unpublished: [],
  excludedPackages: [],
  edges: [],
  waveAdmission: {
    observedAt: "2026-11-15T22:00:00.000Z",
    policyRevision: policy,
    nodes: [
      {
        repository: repo.repository,
        sourceSha: source,
        status: "admitted",
        acceptance: { state: "qualified", reason: "source CI passed" },
        holds: [],
        waits: [],
        branchHolds: [],
        admittedUpdates: [],
        updates: [
          {
            name: "@lapismd/design-core",
            path: "package.json",
            type: "dependencies",
            range: "^0.13.3",
            targetRange: "^0.13.4",
            compatibility: "compatible",
            releaseIntent: "@lapis-notes/api",
          },
        ],
      },
    ],
  },
};

test("native notes identify exact source/wave/candidates and qualify only observed heads", () => {
  const config = repositoryConfig(repo, graph, "/automation");
  assert.equal(Object.hasOwn(config, "prBodyTemplate"), false);
  assert.equal(config.prBodyNotes.length, 1);
  const body = config.prBodyNotes[0];
  assert.match(body, /Lapis dependency context/);
  assert.match(body, new RegExp(`/commit/${source}`));
  assert.match(body, new RegExp(`/commit/${policy}`));
  assert.match(body, /2026-11-15T22:00:00.000Z/);
  assert.match(body, /packages\/api\/package.json/);
  assert.match(body, /repository scan/i);
  assert.match(body, /@lapis-notes\/api/);
  assert.match(body, new RegExp(`/commit/${head}`));
  assert.match(body, /new or regenerated head requires its own CI/i);
  assert.match(body, /next eligible coordinator run/i);
  assert.match(body, /manual.repair/i);
  assert.doesNotMatch(body, /\[[ xX]\]/);
});

test("native sections, checkbox marker, debug metadata and maintainer text survive exact managed replacement", () => {
  const prefix = "Native package table\n\n",
    suffix =
      "\n\n---\nRelease Notes\nConfiguration\n - [ ] <!-- rebase-check -->Retry\n<!--renovate-debug:opaque-->\nMaintainer: retain this.";
  const original = prefix + legacyDependencyNote + suffix;
  const notes = dependencyNotes(repo, graph);
  const updated = updateDependencyBody(original, notes);
  assert.equal(updated, prefix + notes + suffix);
  assert.equal(updateDependencyBody(updated, notes), updated);
  const next = dependencyNotes({ ...repo, sourceSha: head }, {});
  assert.equal(updateDependencyBody(updated, next), prefix + next + suffix);
  assert.equal(
    updateDependencyBody("Maintainer introduction", notes),
    "Maintainer introduction\n\n" + notes,
  );
});

test("unknown and stale wave context is explicit; private coordinates never enter messages", () => {
  const flat = dependencyNotes(repo, {});
  assert.match(flat, /wave evidence.*not captured/i);
  assert.doesNotMatch(flat, /source CI.*qualified/i);
  const stale = dependencyNotes({ ...repo, sourceSha: head }, graph);
  assert.match(stale, /stale.*wave/i);
  assert.doesNotMatch(stale, /source CI.*qualified/i);
  const hidden = dependencyNotes(
    { ...repo, repository: "private/secret", visibility: "private" },
    graph,
  );
  assert.doesNotMatch(hidden, /private\/secret/);
  assert.match(hidden, /public source.*unavailable/i);
});

test("untrusted context is escaped for Markdown and Renovate templates and remains bounded", () => {
  const hostile = structuredClone(graph);
  const node = hostile.waveAdmission.nodes[0];
  node.holds = [
    "{{{secrets}}} | <img src=x> [click](https://evil.invalid)\n - [ ] unsafe".repeat(
      500,
    ),
  ];
  node.waits = Array.from({ length: 100 }, () => ({
    reason: "upstream unavailable",
  }));
  node.updates = Array.from({ length: 100 }, () => ({
    ...node.updates[0],
    path: "[evil](https://evil.invalid)/package.json",
  }));
  const body = dependencyNotes(repo, hostile);
  assert(body.length < 12000);
  assert.doesNotMatch(body, /\{\{|<img|\[click\]|\[evil\]|\[[ xX]\]/);
  assert.match(body, /more/);
  assert.equal(compile(body, { secrets: "UNEXPECTED_TEMPLATE_VALUE" }), body);
  for (const malformed of [
    "<!-- lapis-dependency-context:start -->",
    "<!-- lapis-dependency-context:end -->",
    body + body,
  ])
    assert.throws(() => updateDependencyBody(malformed, body), /Ambiguous/);
  assert.throws(
    () =>
      updateDependencyBody(
        legacyDependencyNote + "\n\n" + legacyDependencyNote,
        body,
      ),
    /Ambiguous/,
  );
  for (const update of node.updates)
    for (const key of [
      "name",
      "path",
      "type",
      "range",
      "targetRange",
      "compatibility",
      "releaseIntent",
    ])
      update[key] = "{".repeat(500);
  assert(
    dependencyNotes(repo, hostile).length < 12000,
    "bounds apply after escaping too",
  );
});

test("stale PR evidence and source/coverage holds are never presented as current-head qualification", () => {
  const held = {
    ...repo,
    holdReason: "manual source repair",
    nonPortable: ["unreleased workspace input"],
    missingChangesets: true,
    evidence: { ...repo.evidence, sha: head },
  };
  const notes = dependencyNotes(held, {
    ...graph,
    coverage: [{ opaqueId: "not-public" }],
  });
  assert.match(notes, /manual source repair/);
  assert.match(notes, /unreleased workspace input/);
  assert.match(notes, /Changesets onboarding required/);
  assert.match(notes, /coverage gaps: 1/);
  assert.doesNotMatch(notes, /not-public|PR #126 checks/);
});

test("profile context describes validated cell deltas and real review/recovery links without claiming CI success", () => {
  const before =
    "| [Demo](https://github.com/lapismd/demo) | CI | @lapismd/demo — **Not published** |";
  const after = before.replace(
    "@lapismd/demo — **Not published**",
    "Published: [@lapismd/demo](https://www.npmjs.com/package/@lapismd/demo) **v1.2.3**",
  );
  const notes = profileNotes({
    before,
    candidate: after,
    sourceSha: source,
    candidateSha: head,
    now: "2026-11-15T22:00:00.000Z",
  });
  assert.match(notes, /1 npm.status cell/);
  assert.match(notes, /Not published/);
  assert.match(notes, /v1.2.3/);
  assert.match(notes, new RegExp(`/commit/${source}`));
  assert.match(notes, new RegExp(`/commit/${head}`));
  assert.match(notes, /2026-11-15T22:00:00.000Z/);
  assert.match(notes, /ordinary candidate CI.*required/i);
  assert.match(notes, /actions\/workflows\/profile-refresh.yml/);
  assert.doesNotMatch(notes, /\[[ xX]\]/);
  const manual = "Maintainer: check the public metadata.";
  const legacy = `Generated from public npm metadata using source ${source}. The coordinator App starts ordinary CI; publication credentials are unchanged.`;
  assert.equal(
    updateProfileBody(legacy + "\n\n" + manual, notes),
    notes + "\n\n" + manual,
  );
  assert.equal(
    updateProfileBody(notes + "\n\n" + manual, notes),
    notes + "\n\n" + manual,
  );
  assert.throws(
    () => updateProfileBody("<!-- lapis-profile-context:start -->", notes),
    /Ambiguous/,
  );
});

test("profile preview shows package deltas rather than truncating a row before its changed package", () => {
  const cell = (name, version) =>
    `Published: [${name}](https://www.npmjs.com/package/${name}) **v${version}**`;
  const unchanged = Array.from({ length: 12 }, (_, i) =>
    cell(`@lapismd/unchanged-${i}`, "1.0.0"),
  ).join("<br>");
  const before = `| [Demo](https://github.com/lapismd/demo) | CI | ${unchanged}<br>${cell("@lapismd/changed", "1.0.0")} |`;
  const candidate = before.replace(
    cell("@lapismd/changed", "1.0.0"),
    cell("@lapismd/changed", "1.0.1"),
  );
  const notes = profileNotes({
    before,
    candidate,
    sourceSha: source,
    candidateSha: head,
    now: "2026-11-15T22:00:00.000Z",
  });
  assert.match(notes, /1 npm-status cell.*1 package status changes/);
  assert.match(notes, /@lapismd\/changed v1.0.0.*@lapismd\/changed v1.0.1/);
  assert.doesNotMatch(notes, /unchanged-/);
});
