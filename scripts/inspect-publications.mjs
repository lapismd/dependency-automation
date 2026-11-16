import { mkdir, writeFile } from "node:fs/promises";
import { inventory, loadAllowlist } from "../src/github.mjs";
import { loadPublicationPolicy } from "../src/publications.mjs";
const entries = await loadAllowlist();
const policy = await loadPublicationPolicy(entries);
const publicationVersions = {};
if (process.argv.length > 18) throw Error("Too many inspection coordinates");
for (const coordinate of process.argv.slice(2)) {
  const match =
    /^(@(?:lapismd|lapis-notes)\/[a-z0-9._-]+)@([0-9A-Za-z.+-]+)$/.exec(
      coordinate,
    );
  if (!match) throw Error("Invalid inspection coordinate");
  (publicationVersions[match[1]] ??= []).push(match[2]);
}
const graph = await inventory(
  entries.filter((entry) => policy.publishers[entry.repository]),
  {
    publicOnly: true,
    waveEvidence: true,
    publicationVersions,
    token: process.env.GH_TOKEN,
    publicationToken: process.env.LAPIS_PUBLICATION_READ_TOKEN,
  },
);
const publications = Object.entries(graph.registry).flatMap(
  ([name, versions]) =>
    Object.entries(versions)
      .filter(([, m]) => m.publication)
      .map(([version, m]) => ({
        name,
        version,
        integrity: m.integrity ?? null,
        evidence: m.publication,
      })),
);
await mkdir("reports", { recursive: true });
await writeFile(
  "reports/publication-evidence.json",
  JSON.stringify(
    {
      schemaVersion: 1,
      kind: "lapis-publication-evidence",
      generatedAt: new Date().toISOString(),
      coverage: graph.publicationCoverage,
      publications,
    },
    null,
    2,
  ) + "\n",
);
for (const item of publications)
  console.log(
    `${item.name}@${item.version}: ${item.evidence.state}; ${item.evidence.reason}; channel ${item.evidence.channel.admitted ? "admitted" : "not admitted"}`,
  );
