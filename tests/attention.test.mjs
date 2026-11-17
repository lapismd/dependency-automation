import test from "node:test";
import assert from "node:assert/strict";
import { nodeAttention } from "../src/wave-attention.mjs";

const sha = "a".repeat(40);
const base = () => ({
  repository: "lapismd/consumer",
  sourceSha: sha,
  holds: [],
  sourceHoldFacts: [],
  branchHolds: [],
  waits: [],
  acceptance: {
    state: "qualified",
    reason: "all observed current workflows and checks completed",
  },
  ownership: {
    state: "bot-owned",
    reason: "PR and branch commit authors verified",
  },
});

test("projects concrete hold categories and remediation coordinates", () => {
  const node = base();
  node.holds = [
    "outside pilot phase",
    "package.json:@lapismd/ui: source-owned canonical preparation does not support this update set",
    "Excluded retained Deno host: dependency writes are not authorized for this root.",
  ];
  node.sourceHoldFacts = [
    {
      message: "@lapismd/ai: unavailable registry prerequisite",
      kind: "unavailable-registry",
      path: "package.json",
      type: "dependencies",
      name: "@lapismd/ai",
      range: "^0.2.0",
    },
  ];
  node.holds.push(node.sourceHoldFacts[0].message);
  node.branchHolds = [
    {
      branch: "lapis-dependencies/lapis-first-party",
      head: "b".repeat(40),
      family: "lapis-first-party",
      reason:
        "retained branch without merged bot ownership; explicit reconciliation required",
    },
  ];
  node.waits = [
    {
      package: "@lapis-notes/search",
      repository: "lapismd/lapis-plugins",
      path: "package.json",
      reason: "upstream qualification/publication required",
    },
  ];
  node.acceptance = { state: "failed", reason: "current CI failure" };

  const attention = nodeAttention(node);
  assert.deepEqual(
    new Set(attention.map((item) => item.category)),
    new Set([
      "rollout",
      "source-preparation",
      "policy-exclusion",
      "publication",
      "branch-reconciliation",
      "qualification",
    ]),
  );
  assert.deepEqual(
    attention.find((item) => item.package === "@lapismd/ai"),
    {
      code: "unavailable-registry",
      category: "publication",
      summary: "@lapismd/ai is unavailable for this consumer",
      detail: "@lapismd/ai: unavailable registry prerequisite",
      remediation:
        "Qualify or publish @lapismd/ai, then refresh coordinator evidence.",
      repository: "lapismd/consumer",
      sourceSha: sha,
      package: "@lapismd/ai",
      path: "package.json",
    },
  );
  assert.equal(
    attention.find((item) => item.code === "branch-reconciliation").branch,
    "lapis-dependencies/lapis-first-party",
  );
  assert.equal(
    attention.find((item) => item.package === "@lapis-notes/search").repository,
    "lapismd/lapis-plugins",
  );
});

test("keeps intentional exclusions distinct from actionable qualification", () => {
  const node = base();
  node.holds = [
    "Excluded retained Deno host: public graph observation only; dependency writes are not authorized for this root.",
  ];
  node.acceptance = {
    state: "unknown",
    reason: "current workflow coverage incomplete",
  };
  const attention = nodeAttention(node);
  assert.equal(attention[0].category, "policy-exclusion");
  assert.match(attention[0].remediation, /policy/i);
  assert.equal(attention[1].category, "qualification");
  assert.match(attention[1].remediation, /current checks/i);
});
