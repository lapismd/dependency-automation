import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function installDockerContext(root) {
  const path = join(root, "scripts/validation/docker.mjs");
  let docker;
  try {
    docker = await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  const importLine =
    'import { specificationDockerArguments } from "../dependency-automation/spec-policy.mjs";\n';
  let runs;
  try {
    runs = await readFile(join(root, "scripts/validation/runs.mjs"), "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (runs?.includes('"worker.mjs"') && runs.includes('"docker.mjs"')) {
    // The worker receives a flat /input bundle, so docker.mjs must remain
    // standalone. Only the host coordinator creates the worker and forwards PR
    // context; put the policy at that boundary instead of inside the bundle.
    docker = docker
      .replace(importLine, "")
      .replace("  args = specificationDockerArguments(args);\n", "");
    if (!runs.includes("dockerWithoutPrContext")) {
      runs = runs.replace(
        /import\s*\{([^}]+)\}\s*from ["']\.\/docker\.mjs["'];/,
        (_, names) => {
          const aliases = names
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name) =>
              ["docker", "output"].includes(name)
                ? `${name} as ${name}WithoutPrContext`
                : name,
            );
          return `import { ${aliases.join(", ")} } from "./docker.mjs";`;
        },
      );
      if (!runs.includes("dockerWithoutPrContext"))
        throw Error("Cannot identify the Docker host import");
      runs =
        importLine +
        "const docker = (config, args) => dockerWithoutPrContext(config, specificationDockerArguments(args));\n" +
        "const output = (config, args) => outputWithoutPrContext(config, specificationDockerArguments(args));\n" +
        runs;
      await writeFile(join(root, "scripts/validation/runs.mjs"), runs);
    }
  } else if (!docker.includes("specificationDockerArguments")) {
    docker =
      importLine +
      docker.replace(
        "export function dockerCommand(config, args) {",
        "export function dockerCommand(config, args) {\n  args = specificationDockerArguments(args);",
      );
  }
  await writeFile(path, docker);
}
