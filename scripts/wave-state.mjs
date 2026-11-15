import { readFile } from "node:fs/promises";
import { publishWaveState } from "../src/wave-state.mjs";
const envelope = JSON.parse(
  await readFile("reports/wave-state-candidate.json", "utf8"),
);
const report = JSON.parse(await readFile("reports/waves.json", "utf8"));
console.log(
  await publishWaveState(envelope.state, envelope.expectedRevision, {
    report,
    enabled: process.env.LAPIS_WAVE_STATE_WRITES === "true",
    repository: process.env.GITHUB_REPOSITORY,
    ref: process.env.GITHUB_REF,
    event: process.env.GITHUB_EVENT_NAME,
    token: process.env.GH_TOKEN,
  }),
);
