import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  monitoringRepositories,
  auditWorkflowAuthentication,
} from "../src/maintenance-policy.mjs";

test("monitoring adds coverage without changing dependency write entries", () => {
  const policy = {
    repositories: [{ repository: "lapismd/mira-mde", phase: "pilot" }],
    monitoring: { repositories: ["lapismd/lapis-maintenance"] },
  };
  const original = structuredClone(policy.repositories);
  assert.deepEqual(monitoringRepositories(policy), [
    "lapismd/lapis-maintenance",
    "lapismd/mira-mde",
  ]);
  assert.deepEqual(policy.repositories, original);
});

test("exclusions win and monitoring defaults remain backward compatible", () => {
  const repositories = [{ repository: "lapismd/mira-mde" }];
  assert.deepEqual(monitoringRepositories({ repositories }), [
    "lapismd/mira-mde",
  ]);
  assert.deepEqual(
    monitoringRepositories({
      repositories,
      monitoring: {
        repositories: ["lapismd/mira-mde"],
        excludedRepositories: ["lapismd/mira-mde"],
      },
    }),
    [],
  );
  for (const entries of [
    ["other/repo"],
    ["lapismd/x", "lapismd/x"],
    "lapismd/x",
  ])
    assert.throws(
      () =>
        monitoringRepositories({
          repositories,
          monitoring: { repositories: entries },
        }),
      /Invalid monitoring/,
    );
});

test("current monitoring covers infrastructure and excludes held-out scope", async () => {
  const policy = JSON.parse(
    await readFile(new URL("../config/repositories.json", import.meta.url)),
  );
  const selected = monitoringRepositories(policy);
  for (const repo of [
    ".github",
    "lapis-ci",
    "lapis-maintenance",
    "dependency-automation",
  ])
    assert(selected.includes(`lapismd/${repo}`));
  assert(
    !selected.some((repo) =>
      /nostr|lapis-community|terminal-host|ai-host|ai-controller/.test(repo),
    ),
  );
  assert(
    !policy.repositories.some((repo) => repo.repository === "lapismd/.github"),
  );
});

test("audit identifies inherited workflow tokens and scoped App references", () => {
  const result = auditWorkflowAuthentication({
    env: { GH_TOKEN: "${{ github.token }}" },
    jobs: {
      refresh: {
        steps: [
          { run: "gh pr create --title update" },
          { id: "app", uses: "actions/create-github-app-token@abc" },
          {
            uses: "changesets/action@abc",
            env: { GITHUB_TOKEN: "${{ steps.app.outputs.token }}" },
          },
          {
            run: "gh pr edit 1",
            env: { GH_TOKEN: "literal-secret-must-not-escape" },
          },
          { run: "gh pr list" },
        ],
      },
    },
  });
  assert.deepEqual(
    result.map((r) => r.authentication),
    ["github-token", "github-app", "unverified"],
  );
  assert(!JSON.stringify(result).includes("literal-secret"));
  assert.equal(result[0].step, 1);
});

test("an arbitrary token output is not proof of App authentication", () => {
  assert.equal(
    auditWorkflowAuthentication({
      jobs: {
        version: {
          steps: [
            {
              uses: "changesets/action@abc",
              env: { GITHUB_TOKEN: "${{ steps.unknown.outputs.token }}" },
            },
          ],
        },
      },
    })[0].authentication,
    "unverified",
  );
});

test("Changesets github-token input is recognized with legacy explicit-env precedence", () => {
  const app = {
    id: "app",
    uses: "actions/create-github-app-token@64ab729a6294000f5aa4a4bc0b73d1f32bc45510",
  };
  const result = auditWorkflowAuthentication({
    jobs: {
      version: {
        steps: [
          app,
          {
            uses: "changesets/action@ae32849d5ba541f9ae29e40e22a623bc13562f51",
            with: {
              "github-token": "${{ steps.app.outputs.token }}",
              "version-script": "pnpm release:version",
            },
          },
          {
            uses: "changesets/action@63a615b9cd06ba9a3e6d13796c7fbcb080a60a0b",
            with: { "github-token": "${{ github.token }}" },
          },
          {
            uses: "changesets/action@63a615b9cd06ba9a3e6d13796c7fbcb080a60a0b",
            with: { "github-token": "${{ steps.app.outputs.token }}" },
            env: { GITHUB_TOKEN: "${{ github.token }}" },
          },
        ],
      },
    },
  });
  assert.deepEqual(
    result.map((f) => f.authentication),
    ["github-app", "github-token", "github-token"],
  );
});
