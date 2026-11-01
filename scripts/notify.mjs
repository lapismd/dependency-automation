import semver from "semver";
import {
  loadAllowlist,
  discoverRepository,
  requestJson,
} from "../src/github.mjs";
import { firstParty, validateNotification } from "../src/policy.mjs";

const entries = await loadAllowlist();
const repository = process.env.SOURCE_REPOSITORY;
const sourceSha = process.env.SOURCE_SHA;
const entry = entries.find((r) => r.repository === repository);
if (!entry || !/^[a-f0-9]{40}$/.test(sourceSha ?? ""))
  throw new Error("Invalid notification source");
const repo = await discoverRepository(entry, {
  token: process.env.SOURCE_READ_TOKEN,
  revision: sourceSha,
});
const packages = [];
for (const { manifest } of repo.manifests) {
  if (
    manifest.private ||
    !firstParty(manifest.name) ||
    !semver.valid(manifest.version) ||
    semver.prerelease(manifest.version)
  )
    continue;
  const metadata = await requestJson(
    `https://registry.npmjs.org/${encodeURIComponent(manifest.name)}/${manifest.version}`,
    { allow404: true },
  );
  if (!metadata) continue;
  if (
    metadata.name !== manifest.name ||
    metadata.version !== manifest.version ||
    !metadata.dist?.integrity
  )
    throw new Error("Published package identity or integrity is missing");
  packages.push({ name: manifest.name, version: manifest.version });
}
if (!packages.length) {
  console.log("No published stable source packages to notify");
} else {
  const client_payload = validateNotification(
    { repository, sourceSha, packages },
    entries,
  );
  const response = await fetch(
    "https://api.github.com/repos/lapismd/dependency-automation/dispatches",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "lapis-npm-published-v1",
        client_payload,
      }),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (response.status !== 204)
    throw new Error(
      `Dependency notification failed (${response.status}); retry this notification job only`,
    );
  console.log(
    `Notified consumers of ${packages.length} published packages at ${sourceSha}`,
  );
}
