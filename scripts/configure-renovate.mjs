import { readFile, writeFile } from "node:fs/promises";
import { repositoryConfig } from "../src/renovate.mjs";
const graph = JSON.parse(await readFile(process.env.LAPIS_INVENTORY, "utf8"));
const repo = graph.repositories.find(
  (r) => r.repository === process.env.LAPIS_TARGET_REPOSITORY,
);
if (!repo) throw new Error("Repository is outside the validated inventory");
await writeFile(
  process.env.LAPIS_RENOVATE_CONFIG,
  JSON.stringify(repositoryConfig(repo, graph, process.cwd()), null, 2) + "\n",
);
