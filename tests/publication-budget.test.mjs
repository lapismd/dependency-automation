import assert from "node:assert/strict";
import test from "node:test";
import {
  observePublications,
  loadPublicationPolicy,
} from "../src/publications.mjs";
import { loadPublicationVerifier } from "../src/publication-tool.mjs";
import { publicationReader, limits } from "../src/publication-transport.mjs";
import {
  publicationFixture,
  owner,
  repo,
  entries,
  metadata,
} from "./publication-source-fixtures.mjs";
import {
  staticFixture,
  owner as pluginOwner,
  repo as pluginRepo,
  metadata as pluginMetadata,
} from "./static-publication-fixtures.mjs";

test("obviously mismatched attestation subjects are held before fetching npm tarball bytes", async () => {
  const f = publicationFixture();
  const envelope = f.attestations.attestations[1].bundle.dsseEnvelope;
  const statement = JSON.parse(Buffer.from(envelope.payload, "base64"));
  statement.subject[0].name = "pkg:npm/%40lapis-notes/other@0.2.8";
  envelope.payload = Buffer.from(JSON.stringify(statement)).toString("base64");
  const result = await observePublications(
    [owner],
    new Map([[owner.name, f.packument]]),
    [repo],
    entries,
    { fetcher: f.fetcher },
  );
  const evidence = result.observations.get(owner.name + "@" + metadata.version);
  assert.equal(evidence.state, "unknown");
  assert.equal(evidence.reason, "publication-subject-mismatch");
  assert.equal(evidence.proof, undefined);
  assert(
    !f.requests.some((r) => r.url.endsWith(".tgz")),
    "Invalid claims must not consume tarball budget",
  );
});

test("every current owned package is observed before any other tag or retained baseline", async () => {
  const notes = publicationFixture(),
    plugin = staticFixture(),
    requests = [];
  const otherVersion = "0.0.1";
  const old = structuredClone(metadata);
  old.version = otherVersion;
  old.dist.attestations.url = old.dist.attestations.url.replace(
    "@" + metadata.version,
    "@" + otherVersion,
  );
  notes.packument.versions[otherVersion] = old;
  const fetcher = (url, options) => {
    requests.push(url);
    if (
      url.includes("lapis-plugins") ||
      url === pluginMetadata.dist.attestations.url ||
      url === pluginMetadata.dist.tarball
    )
      return plugin.fetcher(url, options);
    return notes.fetcher(url, options);
  };
  const result = await observePublications(
    [owner, pluginOwner],
    new Map([
      [owner.name, notes.packument],
      [
        pluginOwner.name,
        {
          "dist-tags": { latest: pluginMetadata.version },
          versions: { [pluginMetadata.version]: plugin.metadata },
        },
      ],
    ]),
    [repo, pluginRepo],
    entries,
    { fetcher, publicationVersions: { [owner.name]: [otherVersion] } },
  );
  assert.equal(
    result.observations.get(owner.name + "@" + metadata.version).state,
    "verified",
  );
  assert.equal(
    result.observations.get(pluginOwner.name + "@" + pluginMetadata.version)
      .state,
    "verified",
  );
  const pluginRead = requests.indexOf(pluginMetadata.dist.attestations.url);
  const historicalRead = requests.indexOf(old.dist.attestations.url);
  assert(pluginRead >= 0 && historicalRead >= 0);
  assert(
    pluginRead < historicalRead,
    "A retained historical probe must not consume resources before another current package",
  );
  assert.equal(
    result.observations.get(owner.name + "@" + otherVersion).state,
    "unknown",
  );
});

test("static verifier size authority cannot widen Notes, foreign publishers or unknown profiles", async () => {
  const verifier = await loadPublicationVerifier(
    (await loadPublicationPolicy(entries)).tool,
  );
  for (const request of [
    { repository: "lapismd/lapis-notes" },
    { repository: "lapismd/lapis-notes", profile: "plugins-static-v1" },
    { repository: "lapismd/lapis-plugins", profile: "unknown" },
    { repository: "lapismd/lapis-plugins" },
  ])
    await assert.rejects(
      verifier.verify({}, request, Buffer.alloc(4 * 1024 * 1024 + 1)),
      /publication-subject-mismatch/,
    );
  await assert.rejects(
    verifier.verify(
      {},
      { repository: "lapismd/lapis-plugins", profile: "plugins-static-v1" },
      Buffer.alloc(16 * 1024 * 1024 + 1),
    ),
    /publication-subject-mismatch/,
  );
});

test("the shared byte budget remains bounded and duplicate reads do not spend it twice", async () => {
  const chunk = Buffer.alloc(32 * 1024 * 1024),
    reader = publicationReader({
      fetcher: async (url) =>
        new Response(url.endsWith("overflow") ? "x" : chunk),
    });
  for (let n = 0; n < 4; n++)
    await reader.bytes("https://registry.npmjs.org/budget/" + n, chunk.length);
  assert.equal(reader.counts().bytes, limits.totalBytes);
  assert.equal(reader.counts().requests, 4);
  await reader.bytes("https://registry.npmjs.org/budget/0", chunk.length);
  assert.equal(reader.counts().requests, 4);
  await assert.rejects(
    reader.bytes("https://registry.npmjs.org/budget/overflow", 1),
    /publication-byte-limit/,
  );
});
