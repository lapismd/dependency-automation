import { appendFile, readFile } from "node:fs/promises";
import { loadAllowlist } from "../src/github.mjs";
import { loadCompletionPolicy, qualifyCompletion } from "../src/completion.mjs";

export async function currentCompletion() {
  const policy = await loadCompletionPolicy(await loadAllowlist());
  const event = JSON.parse(
    await readFile(process.env.GITHUB_EVENT_PATH, "utf8"),
  );
  return qualifyCompletion(
    {
      repository: process.env.GITHUB_REPOSITORY,
      eventName: process.env.GITHUB_EVENT_NAME,
      ref: process.env.GITHUB_REF,
      sha: process.env.GITHUB_SHA,
      runId: Number(process.env.GITHUB_RUN_ID),
      runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT),
    },
    event,
    policy,
    { token: process.env.SOURCE_READ_TOKEN },
  );
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const result = await currentCompletion();
  console.log(`Completion notification: ${result.reason}`);
  if (process.env.GITHUB_OUTPUT)
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `eligible=${result.eligible}\nsource-sha=${result.sourceSha ?? ""}\n`,
    );
}
