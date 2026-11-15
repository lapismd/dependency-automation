import { readFile } from "node:fs/promises";
import { publishProfile } from "../src/profile-writer.mjs";

const token = process.env.GH_TOKEN;
if (!token) throw Error("Scoped App token required");
const candidate = await readFile("candidate/README.md", "utf8");
async function api(path, method = "GET", body, allow404 = false) {
  const response = await fetch(
    `https://api.github.com/repos/lapismd/.github/${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (allow404 && response.status === 404) return null;
  // Do not retry writes with uncertain outcomes or log response bodies/tokens.
  if (!response.ok)
    throw Error(
      `Profile API ${method} ${path.split("?")[0]} failed (${response.status}); reconcile before retry`,
    );
  return response.json();
}
console.log(
  JSON.stringify(
    await publishProfile({
      api,
      candidate,
      sourceSha: process.env.PROFILE_SOURCE_SHA,
    }),
  ),
);
