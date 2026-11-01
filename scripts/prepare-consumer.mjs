import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import YAML from "yaml";
import { loadAllowlist } from "../src/github.mjs";
import { consumerChecks } from "../src/consumer-ci.mjs";

const [directory, repository, coordinatorRef] = process.argv.slice(2);
if (
  !directory ||
  !/^(lapismd|stevejuma)\/[\w.-]+$/.test(repository ?? "") ||
  !/^[a-f0-9]{40}$/.test(coordinatorRef ?? "")
)
  throw Error(
    "Usage: prepare-consumer.mjs <checkout> <owner/repository> <coordinator-sha>",
  );
if (!(await loadAllowlist()).some((entry) => entry.repository === repository))
  throw Error("Consumer is outside this rollout's repository allowlist");
const root = resolve(directory);
const policyPath = "scripts/dependency-automation/spec-policy.mjs";
await mkdir(join(root, "scripts/dependency-automation"), { recursive: true });
await writeFile(
  join(root, policyPath),
  await readFile(new URL("../templates/spec-policy.mjs", import.meta.url)),
);
const proxy = `node ${policyPath}`;
const wrap = (command) =>
  command
    .replace(
      /(?:pnpm (?:exec|dlx) )?spec-validator (check|validate|build|first)(?=\s|$)/g,
      `${proxy} $1`,
    )
    .replace(
      /node (?:\.\/)?dist\/cli\.js (check|validate|build|first)(?=\s|$)/g,
      `${proxy} --local $1`,
    );
const manifestPath = join(root, "package.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
for (const [name, command] of Object.entries(manifest.scripts ?? {})) {
  if (
    name === "spec:lint" &&
    !command.includes("validation.mjs") &&
    !command.includes(policyPath) &&
    !/spec-validator/.test(command)
  )
    manifest.scripts[name] =
      `${proxy} --command spec:lint '${command.replaceAll("'", "'\\''")}'`;
  else manifest.scripts[name] = wrap(command);
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
try {
  const file = join(root, "scripts/validation/lanes.json");
  const lanes = JSON.parse(await readFile(file, "utf8"));
  for (const [name, command] of Object.entries(lanes)) {
    if (
      /^(spec:lint|check:specification-docs)$/.test(name) &&
      !command.includes(policyPath)
    )
      lanes[name] =
        `${proxy} --command ${name} '${command.replaceAll("'", "'\\''")}'`;
    else lanes[name] = wrap(command);
  }
  await writeFile(file, JSON.stringify(lanes, null, 2) + "\n");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
try {
  const file = join(root, "scripts/validation/docker.mjs");
  let text = await readFile(file, "utf8");
  if (!text.includes("specificationDockerArguments")) {
    text =
      `import { specificationDockerArguments } from "../dependency-automation/spec-policy.mjs";\n` +
      text.replace(
        "export function dockerCommand(config, args) {",
        "export function dockerCommand(config, args) {\n  args = specificationDockerArguments(args);",
      );
    await writeFile(file, text);
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const context = {
  LAPIS_CI_EVENT: "${{ github.event_name }}",
  LAPIS_CI_PR_AUTHOR: "${{ github.event.pull_request.user.login }}",
  LAPIS_CI_PR_AUTHOR_TYPE: "${{ github.event.pull_request.user.type }}",
  LAPIS_CI_PR_HEAD: "${{ github.event.pull_request.head.ref }}",
  LAPIS_DEPENDENCY_BOT_LOGIN: "${{ vars.LAPIS_DEPENDENCY_BOT_LOGIN }}",
};
const workflowFolder = join(root, ".github/workflows");
for (const name of await readdir(workflowFolder)) {
  if (!/\.ya?ml$/.test(name)) continue;
  const file = join(workflowFolder, name);
  const original = await readFile(file, "utf8");
  const doc = YAML.parseDocument(original);
  const w = doc.toJS();
  const on = w.on ?? {};
  if (
    (typeof on === "object" &&
      (Object.hasOwn(on, "pull_request") ||
        Object.hasOwn(on, "workflow_call"))) ||
    (Array.isArray(on) && on.includes("pull_request")) ||
    on === "pull_request"
  ) {
    for (const [key, value] of Object.entries(context))
      doc.setIn(["env", key], value);
  }
  for (const [id, job] of Object.entries(w.jobs ?? {})) {
    const standaloneBook = name === "publish-spec-pages.yml";
    if (
      standaloneBook &&
      !String(job.if ?? "").includes("lapismd-dependency-bot[bot]")
    ) {
      const trusted =
        "github.event_name == 'pull_request' && github.event.pull_request.user.type == 'Bot' && (contains(fromJSON('[\"dependabot[bot]\",\"renovate[bot]\",\"lapismd-dependency-bot[bot]\"]'), github.event.pull_request.user.login) || (vars.LAPIS_DEPENDENCY_BOT_LOGIN != '' && github.event.pull_request.user.login == vars.LAPIS_DEPENDENCY_BOT_LOGIN))";
      const previous = String(job.if ?? "true")
        .replace(/^\s*\$\{\{/, "")
        .replace(/\}\}\s*$/, "")
        .trim();
      doc.setIn(["jobs", id, "if"], `(${previous}) && !(${trusted})`);
    }
    for (let index = 0; index < (job.steps ?? []).length; index++) {
      const step = job.steps[index];
      if (step.run)
        doc.setIn(
          ["jobs", id, "steps", index, "run"],
          standaloneBook
            ? step.run.replaceAll(proxy + " ", "spec-validator ")
            : wrap(step.run),
        );
      if (
        step.if?.includes("lapismd-dependency-bot[bot]") &&
        !/spec[: -]|specification|progress evidence/i.test(
          `${step.name ?? ""} ${step.run ?? ""}`,
        )
      ) {
        const suffix = ") && !(github.event.pull_request.user.type == 'Bot' &&";
        const end = step.if.indexOf(suffix);
        if (step.if.startsWith("(") && end > 0)
          doc.setIn(["jobs", id, "steps", index, "if"], step.if.slice(1, end));
      }
      if (
        step.if &&
        /changeset-release|dependabot/.test(step.if) &&
        /spec[: -]|specification|progress evidence/i.test(
          `${step.name ?? ""} ${step.run ?? ""}`,
        ) &&
        !step.if.includes("lapismd-dependency-bot[bot]")
      ) {
        const previous = step.if
          .replace(/^\s*\$\{\{/, "")
          .replace(/\}\}\s*$/, "")
          .trim();
        const trusted =
          "github.event.pull_request.user.type == 'Bot' && (contains(fromJSON('[\"dependabot[bot]\",\"renovate[bot]\",\"lapismd-dependency-bot[bot]\"]'), github.event.pull_request.user.login) || (vars.LAPIS_DEPENDENCY_BOT_LOGIN != '' && github.event.pull_request.user.login == vars.LAPIS_DEPENDENCY_BOT_LOGIN))";
        doc.setIn(
          ["jobs", id, "steps", index, "if"],
          `(${previous}) && !(${trusted})`,
        );
      }
    }
  }
  // Only jobs that actually verify npm are eligible notification boundaries.
  let boundary = Object.entries(w.jobs ?? {}).find(
    ([id, j]) =>
      /^(verify|verify-provenance|verify-registry)$/.test(id) &&
      (j.steps ?? []).some((s) =>
        /release:verify|npm-release\.mjs verify|conversations-npm\.mjs verify|npm audit signatures|['"]audit['"], ['"]signatures['"]/.test(
          s.run ?? "",
        ),
      ),
  )?.[0];
  if (
    !boundary &&
    ["lapismd/agent-redaction", "lapismd/ai-controller"].includes(repository) &&
    name === "release.yml"
  )
    boundary = "publish";
  if (
    !boundary &&
    repository === "lapismd/lapis-plugin-tasks" &&
    name === "ci.yml"
  )
    boundary = "publish";
  if (
    !boundary &&
    repository === "lapismd/lapis-plugins" &&
    name === "release.yml"
  )
    boundary = "static-publish";
  if (boundary) {
    const source =
      repository === "lapismd/agent-ui"
        ? {
            job: "package-gate",
            value: "${{ needs.package-gate.outputs.pack_source }}",
          }
        : repository === "stevejuma/jj-store" && name.includes("conversations")
          ? { job: "identity", value: "${{ needs.identity.outputs.source }}" }
          : repository === "lapismd/lapis-terminal" &&
              name === "publish-npm.yml"
            ? { job: "plan", value: "${{ needs.plan.outputs.sha }}" }
            : null;
    doc.setIn(["jobs", "notify-dependencies"], {
      name: "Notify dependency consumers",
      needs: source ? [boundary, source.job] : [boundary],
      if: `always() && needs.${boundary}.result == 'success'`,
      permissions: { contents: "read" },
      uses: `lapismd/dependency-automation/.github/workflows/notify.yml@${coordinatorRef}`,
      with: {
        "automation-ref": coordinatorRef,
        "source-sha": source?.value ?? "${{ github.sha }}",
      },
      secrets: {
        "app-private-key": "${{ secrets.LAPIS_DEPENDENCY_APP_PRIVATE_KEY }}",
      },
    });
  }
  if (JSON.stringify(doc.toJS()) !== JSON.stringify(w))
    await writeFile(file, doc.toString({ lineWidth: 0 }));
}
try {
  const file = join(root, ".github/dependabot.yml");
  const doc = YAML.parseDocument(await readFile(file, "utf8"));
  const updates = doc.get("updates", true);
  for (const update of updates.items)
    if (update.get("package-ecosystem") === "npm") {
      let ignore = update.get("ignore", true);
      if (!ignore) {
        update.set("ignore", doc.createNode([]));
        ignore = update.get("ignore", true);
      }
      for (const scope of ["@lapismd/*", "@lapis-notes/*"]) {
        if (!ignore.items.some((v) => v.get("dependency-name") === scope))
          ignore.add(
            doc.createNode({
              "dependency-name": scope,
              "update-types": [
                "version-update:semver-major",
                "version-update:semver-minor",
                "version-update:semver-patch",
              ],
            }),
          );
      }
    }
  await writeFile(file, doc.toString({ lineWidth: 0 }));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const checks = consumerChecks(repository, manifest.packageManager, context);
if (checks)
  await writeFile(
    join(workflowFolder, "dependency-check.yml"),
    YAML.stringify(checks),
  );
console.log(`Prepared ${repository} at ${root}`);
