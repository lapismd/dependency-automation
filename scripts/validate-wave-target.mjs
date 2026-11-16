import { readFile, writeFile } from "node:fs/promises";
import { revalidateChannels } from "../src/channels.mjs";
import { discoverRepository } from "../src/github.mjs";
import { observeRepository } from "../src/wave-evidence.mjs";
import { planWaves } from "../src/waves.mjs";
import { readWaveState } from "../src/wave-state.mjs";
if (process.env.LAPIS_WAVES_ENABLED === "true") {
  const graph = JSON.parse(await readFile(process.env.LAPIS_INVENTORY, "utf8"));
  const previous = JSON.parse(
    await readFile("reports/wave-state-before.json", "utf8"),
  );
  const target = process.env.LAPIS_TARGET_REPOSITORY;
  const index = graph.repositories.findIndex((r) => r.repository === target);
  if (index < 0) throw Error("Target outside inventory");
  const old = graph.repositories[index];
  const options = {
    token: process.env.GH_TOKEN,
    publicOnly: true,
    waveEvidence: true,
    botLogin: process.env.LAPIS_BOT_LOGIN,
    botAuthor: process.env.LAPIS_BOT_GIT_AUTHOR,
  };
  const fresh = await discoverRepository(old, options);
  if (
    !fresh ||
    fresh.visibility !== "public" ||
    fresh.sourceSha !== old.sourceSha
  )
    throw Error(
      "Source changed or coverage unavailable; re-inventory required",
    );
  await revalidateChannels(graph, options);
  fresh.evidence = await observeRepository(fresh, options);
  graph.repositories[index] = fresh;
  const plan = planWaves(graph, previous.state, {
    ...options,
    phase: process.env.LAPIS_ROLLOUT_PHASE,
    writes: process.env.LAPIS_WRITE_ENABLED === "true",
    policyRevision: process.env.GITHUB_SHA,
  });
  if (!plan.admitted.includes(target))
    throw Error(
      "Target no longer admitted; preserve repair or wait for qualification",
    );
  if (process.env.LAPIS_WRITE_ENABLED === "true") {
    const stored = await readWaveState(options);
    const node = plan.report.nodes.find((n) => n.repository === target);
    if (
      stored.state.policyRevision !== process.env.GITHUB_SHA ||
      stored.state.operations[node.operationId]?.status !== "admitted"
    )
      throw Error("Durable admission missing; hold consumer writes");
  }
  graph.waveAdmission = plan.report;
  await writeFile(
    process.env.LAPIS_INVENTORY,
    JSON.stringify(graph, null, 2) + "\n",
  );
}
