import { readFile } from "node:fs/promises";

const base = new URL("./fixtures/agent-ui-publication/", import.meta.url);
export const inputs = JSON.parse(await readFile(new URL("inputs.json", base)));
const index = JSON.parse(await readFile(new URL("responses.json", base)));
const original = new Map(
  await Promise.all(
    Object.entries(index).map(async ([url, file]) => [
      url,
      await readFile(new URL(file, base)),
    ]),
  ),
);
export const sourceSha = "48435a193aadb906006800f36858fd33d8e278de";
export const api = "https://api.github.com/repos/lapismd/agent-ui";
export const artifactUrl = `${api}/actions/artifacts/14190407906/zip`;

/** Actual public responses captured from the original publication, never signed test claims. */
export function taggedFixture() {
  const f = {
    records: new Map(
      [...original].map(([url, bytes]) => [url, Buffer.from(bytes)]),
    ),
    inputs: structuredClone(inputs),
    requests: [],
    json(url) {
      return JSON.parse(f.records.get(url));
    },
    change(url, mutate) {
      const value = f.json(url);
      mutate(value);
      f.records.set(url, Buffer.from(JSON.stringify(value)));
    },
    async fetcher(url, options) {
      f.requests.push({ url, options });
      const bytes = f.records.get(url);
      if (!bytes) throw Error(`Unexpected captured-fixture request: ${url}`);
      return new Response(bytes, { status: 200 });
    },
  };
  return f;
}
