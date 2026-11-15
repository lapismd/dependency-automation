import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import YAML from "yaml";
import { auditPreflight } from "../src/audit-preflight.mjs";

test("actual preflight subprocess binds source/lock and rejects dirty or malformed evidence", async () => {
  for (const colocated of [false, true]) {
    const root = await mkdtemp(join(tmpdir(), "lapis-audit-preflight-"));
    await mkdir(join(root, "config"));
    await mkdir(join(root, "bin"));
    await writeFile(join(root, "package.json"), "{}\n");
    await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: 9\n");
    await writeFile(
      join(root, "config/advisories.json"),
      JSON.stringify({ schemaVersion: 1, maxApprovalDays: 30, approvals: [] }),
    );
    const audit = {
      advisories: {},
      muted: [],
      metadata: {
        vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 },
      },
    };
    const command = join(root, "bin/pnpm");
    await writeFile(
      command,
      `#!${process.execPath}\nconsole.log(${JSON.stringify(JSON.stringify(audit))});\n`,
    );
    await chmod(command, 0o755);
    execFileSync(
      "jj",
      ["git", "init", ...(colocated ? ["--colocate"] : []), root],
      { stdio: "pipe" },
    );
    for (const [key, value] of [
      ["user.name", "Fixture"],
      ["user.email", "fixture@example.test"],
      ["signing.behavior", "drop"],
    ])
      execFileSync("jj", ["config", "set", "--repo", key, value], {
        cwd: root,
        stdio: "pipe",
      });
    execFileSync("jj", ["commit", "-m", "Frozen fixture"], {
      cwd: root,
      stdio: "pipe",
    });
    const original = process.env.PATH;
    process.env.PATH = `${join(root, "bin")}:${original}`;
    try {
      const result = await auditPreflight({ root });
      assert.equal(result.allowed, true);
      assert.match(result.sourceSha, /^[a-f0-9]{40}$/);
      assert.match(result.lockSha256, /^[a-f0-9]{64}$/);
      await writeFile(
        command,
        `#!${process.execPath}\nconsole.log('{"error":"private-unexpected-body"}');\nprocess.exitCode=1;\n`,
      );
      const unavailable = await auditPreflight({ root });
      assert.equal(unavailable.allowed, false);
      assert.equal(unavailable.coverage, "unavailable");
      assert(!JSON.stringify(unavailable).includes("private-unexpected-body"));
      await writeFile(
        join(root, "pnpm-lock.yaml"),
        "lockfileVersion: 9\nchanged: true\n",
      );
      assert.equal((await auditPreflight({ root })).coverage, "unavailable");
    } finally {
      process.env.PATH = original;
    }
  }
});

test("production inventory preflight precedes wave planning and denies writable matrices", async () => {
  const source = await readFile(
    new URL("../scripts/inventory.mjs", import.meta.url),
    "utf8",
  );
  assert(
    source.indexOf("await auditPreflight()") <
      source.indexOf("waves = planWaves("),
  );
  assert.match(source, /writes: qualifiedWrites/);
  assert.match(source, /!writesRequested \|\| qualifiedWrites/);
  const workflow = YAML.parse(
    await readFile(
      new URL("../.github/workflows/reconcile.yml", import.meta.url),
      "utf8",
    ),
  );
  const steps = workflow.jobs.reconcile.steps;
  const checkout = steps.find((s) => s.uses?.startsWith("actions/checkout@"));
  assert.equal(
    checkout.with["fetch-depth"],
    0,
    "exact last dependency commit requires full checkout history",
  );
  assert.equal(checkout.with["persist-credentials"], false);
  const audit = steps.findIndex(
    (s) => s.run === "node scripts/audit-preflight.mjs",
  );
  const mint = steps.findIndex((s) => s.id === "app");
  assert(audit >= 0 && audit < mint);
  assert.match(steps[audit].if, /LAPIS_WRITE_ENABLED == 'true'/);
  assert.match(steps[mint].if, /LAPIS_WRITE_ENABLED == 'true'/);
  assert(
    !workflow.jobs["wave-state"].if.includes(
      "LAPIS_DEPENDENCY_WRITES == 'true'",
    ),
  );
});
