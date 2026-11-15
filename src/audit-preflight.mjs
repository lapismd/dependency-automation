import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { auditFindings, evaluateAdvisories } from "./advisories.mjs";
import { requestJson } from "./github.mjs";

/** Audit this installed, frozen coordinator graph, never a consumer approximation. */
export async function auditPreflight({
  root = process.cwd(),
  fetcher = fetch,
} = {}) {
  let sourceSha, lockSha256;
  try {
    let colocated = true;
    try {
      await access(`${root}/.git`);
    } catch {
      colocated = false;
    }
    const run = (command, args) =>
      execFileSync(command, args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    if (!colocated) {
      sourceSha = run("jj", [
        "log",
        "-r",
        'latest(ancestors(@) & (files("package.json") | files("pnpm-lock.yaml")))',
        "--no-graph",
        "-T",
        "commit_id",
      ]);
      if (
        run("jj", [
          "diff",
          "--from",
          "@-",
          "--to",
          "@",
          "--name-only",
          "package.json",
          "pnpm-lock.yaml",
        ])
      )
        throw Error("Uncommitted dependency graph");
    } else {
      sourceSha = execFileSync(
        "git",
        ["log", "-1", "--format=%H", "--", "package.json", "pnpm-lock.yaml"],
        { cwd: root, encoding: "utf8" },
      ).trim();
      // Refuse an uncommitted dependency graph, including staged changes.
      execFileSync(
        "git",
        ["diff", "--exit-code", "HEAD", "--", "package.json", "pnpm-lock.yaml"],
        { cwd: root, stdio: "pipe" },
      );
    }
    lockSha256 = createHash("sha256")
      .update(await readFile(`${root}/pnpm-lock.yaml`))
      .digest("hex");
    const policy = JSON.parse(
      await readFile(`${root}/config/advisories.json`, "utf8"),
    );
    const command = spawnSync("pnpm", ["audit", "--json"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    if (command.error || ![0, 1].includes(command.status))
      throw Error("Audit command unavailable");
    const audit = JSON.parse(command.stdout);
    const names = [
      ...new Set(auditFindings(audit).map((finding) => finding.package)),
    ];
    const registry = {};
    for (const name of names)
      registry[name] = await requestJson(
        `https://registry.npmjs.org/${encodeURIComponent(name)}`,
        { fetcher },
      );
    return evaluateAdvisories(audit, policy, {
      sourceSha,
      lockSha256,
      registry,
    });
  } catch {
    // No subprocess output, registry bodies or private coordinates escape this boundary.
    return {
      schemaVersion: 1,
      allowed: false,
      coverage: "unavailable",
      reason: "Coordinator audit, source binding or fix metadata unavailable",
      ...(sourceSha ? { sourceSha } : {}),
      ...(lockSha256 ? { lockSha256 } : {}),
    };
  }
}
