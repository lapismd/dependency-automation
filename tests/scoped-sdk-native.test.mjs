import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { scopedSdkFixture } from "./helpers/scoped-sdk.mjs";
import { planWaves, emptyState } from "../src/waves.mjs";
import { projectionPath } from "../src/artifact-projection.mjs";
import { intakePolicyPath } from "../src/canonical-intake.mjs";

for (const revoke of [false, true])
  test(
    `actual native frozen SDK generation ${revoke ? "rejects a late scope revocation before copyback" : "retains its exact independent scope"}`,
    { timeout: 180000 },
    async () => {
      const f = scopedSdkFixture(),
        root = await mkdtemp(join(tmpdir(), "scoped-sdk-native-")),
        tools = await mkdtemp(join(tmpdir(), "scoped-sdk-port-"));
      try {
        const before = {
          ...f.inputs,
          [projectionPath]: f.repo.artifactProjection.bytes,
          [intakePolicyPath]: f.repo.canonicalIntake.policyBytes,
        };
        for (const [path, bytes] of Object.entries(before)) {
          await mkdir(dirname(join(root, path)), { recursive: true });
          await writeFile(join(root, path), bytes);
        }
        const candidate = JSON.parse(before["package.json"]);
        candidate.devDependencies[f.sdk] = "0.2.1";
        await writeFile(join(root, "package.json"), JSON.stringify(candidate));
        const node = planWaves(f.graph, emptyState(), f.options).report
            .nodes[0],
          scope = node.scopedAdmission;
        assert.equal(node.status, "admitted");
        const context = {
          descriptorSha256: f.grant.descriptorSha256,
          capabilitySha256: f.options.artifactCapabilities.sha256,
          scopeEligibility: {
            policySha256: scope.policySha256,
            grantSha256: scope.grantSha256,
            descriptorSha256: scope.descriptorSha256,
          },
          update: {
            ...node.admittedUpdates[0],
            integrity: f.graph.registry[f.sdk]["0.2.1"].integrity,
          },
        };
        const inputFile = join(tools, "input.json"),
          outputFile = join(tools, "output.json"),
          capabilityBytes = JSON.stringify({
            schemaVersion: 1,
            repositories: { [f.repo.repository]: f.grant.descriptorSha256 },
          });
        await writeFile(
          inputFile,
          JSON.stringify({
            root,
            sourceSha: f.repo.sourceSha,
            before,
            capabilityBytes,
            scopeBytes: f.options.scopedEligibility,
            capabilityPath: fileURLToPath(
              new URL("../config/artifact-projections.json", import.meta.url),
            ),
            scopePath: fileURLToPath(
              new URL("../config/scoped-admissions.json", import.meta.url),
            ),
            portMutation: revoke ? "revoke-scope" : null,
          }),
        );
        const moduleUrl = new URL(
          "../src/artifact-projection-files.mjs",
          import.meta.url,
        ).href;
        const code = `import {writeFileSync} from 'node:fs';const {prepareProjectedArtifacts}=await import(${JSON.stringify(moduleUrl)});try{const result=await prepareProjectedArtifacts(${JSON.stringify({ root, repository: f.repo.repository, sourceSha: f.repo.sourceSha, context })});writeFileSync(${JSON.stringify(outputFile)},JSON.stringify({allowed:true,result}));}catch(error){writeFileSync(${JSON.stringify(outputFile)},JSON.stringify({allowed:false,error:error.message}));}`;
        execFileSync(
          process.execPath,
          [
            "--experimental-test-module-mocks",
            "--import",
            fileURLToPath(
              new URL("./helpers/projection-source-port.mjs", import.meta.url),
            ),
            "--input-type=module",
            "-e",
            code,
          ],
          {
            cwd: root,
            env: {
              PATH: dirname(process.execPath) + ":/usr/bin:/bin",
              TMPDIR: tmpdir(),
              LAPIS_TEST_PROJECTION_PORT: inputFile,
            },
            encoding: "utf8",
            timeout: 180000,
            maxBuffer: 1024 * 1024,
          },
        );
        const output = JSON.parse(await readFile(outputFile, "utf8"));
        if (revoke) {
          assert.equal(output.allowed, false);
          assert.match(output.error, /revoked|stale/);
          assert.equal(
            await readFile(join(root, "pnpm-lock.yaml"), "utf8"),
            before["pnpm-lock.yaml"],
          );
        } else {
          assert.equal(output.allowed, true, output.error);
          assert.equal(output.result.changed, true);
          assert.equal(output.result.proof.node, "24.15.0");
          assert.equal(output.result.proof.fullRootProductionQualified, false);
          assert.notEqual(
            await readFile(join(root, "pnpm-lock.yaml"), "utf8"),
            before["pnpm-lock.yaml"],
          );
        }
        const expectedWorkspace = revoke
          ? before["pnpm-workspace.yaml"]
          : before["pnpm-workspace.yaml"].replace(
              '"@lapismd/spec-validator": 0.2.0',
              '"@lapismd/spec-validator": 0.2.1',
            );
        assert.equal(
          await readFile(join(root, "pnpm-workspace.yaml"), "utf8"),
          expectedWorkspace,
        );
        for (const path of [
          "scripts/ci-sources.json",
          ".github/ci-docs/package.json",
        ])
          assert.equal(await readFile(join(root, path), "utf8"), before[path]);
      } finally {
        await rm(root, { recursive: true, force: true });
        await rm(tools, { recursive: true, force: true });
      }
    },
  );
