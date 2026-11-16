import { inflateRawSync } from "node:zlib";

export const limits = Object.freeze({
  requests: 256,
  totalBytes: 64 * 1024 * 1024,
  json: 2 * 1024 * 1024,
  artifact: 8 * 1024 * 1024,
  tarball: 4 * 1024 * 1024,
  entries: 1024,
  inflated: 32 * 1024 * 1024,
});
const reject = (reason) => {
  throw Error(reason);
};
const blobHost = (host) =>
  /^(?:[a-z0-9-]+\.)?(?:blob\.core\.windows\.net|githubusercontent\.com)$/.test(
    host,
  );

export function publicationReader({ token, fetcher = fetch } = {}) {
  const cache = new Map();
  let requests = 0,
    total = 0;
  async function bytes(url, max = limits.json, artifact = false) {
    const key = `${max}:${url}`;
    if (cache.has(key)) return cache.get(key);
    const result = (async () => {
      let current = new URL(url);
      if (
        !["https://api.github.com", "https://registry.npmjs.org"].includes(
          current.origin,
        ) ||
        current.username ||
        current.password ||
        current.hash
      )
        reject("publication-url-rejected");
      for (let redirect = 0; redirect <= 2; redirect++) {
        if (++requests > limits.requests) reject("publication-request-limit");
        const headers = { Accept: "application/json" };
        if (current.origin === "https://api.github.com" && token)
          headers.Authorization = `Bearer ${token}`;
        const response = await fetcher(current.href, {
          method: "GET",
          headers,
          redirect: "manual",
          signal: AbortSignal.timeout(30000),
        });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const next = new URL(response.headers.get("location"), current);
          if (
            next.protocol !== "https:" ||
            next.username ||
            next.password ||
            next.hash ||
            !(
              next.origin === current.origin ||
              (artifact && blobHost(next.hostname))
            )
          )
            reject("publication-redirect-rejected");
          current = next;
          continue;
        }
        if (artifact && [401, 403].includes(response.status))
          reject("publication-artifact-read-unavailable");
        if (response.status === 404) reject("publication-evidence-unavailable");
        if (
          !response.ok ||
          Number(response.headers?.get("content-length") ?? 0) > max
        )
          reject("publication-response-rejected");
        const body = response.body?.getReader();
        if (!body) reject("publication-body-unavailable");
        const chunks = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await body.read();
            if (done) break;
            size += value.length;
            total += value.length;
            if (size > max || total > limits.totalBytes)
              reject("publication-byte-limit");
            chunks.push(Buffer.from(value));
          }
        } finally {
          await body.cancel();
        }
        return Buffer.concat(chunks);
      }
      reject("publication-redirect-limit");
    })();
    cache.set(key, result);
    return result;
  }
  return {
    bytes,
    async json(url, max = limits.json) {
      return JSON.parse((await bytes(url, max)).toString("utf8"));
    },
    counts: () => ({ requests, bytes: total }),
  };
}

// Metadata-only ZIP reader: no extraction, filesystem writes, or candidate code.
export function publicArtifact(
  buffer,
  allowed = undefined,
  archiveLimit = limits.artifact,
) {
  if (
    buffer.length > archiveLimit ||
    archiveLimit > 24 * 1024 * 1024 ||
    buffer.length < 22
  )
    reject("publication-archive-rejected");
  let end = -1;
  for (let n = buffer.length - 22; n >= Math.max(0, buffer.length - 65557); n--)
    if (
      buffer.readUInt32LE(n) === 0x06054b50 &&
      n + 22 + buffer.readUInt16LE(n + 20) === buffer.length
    ) {
      end = n;
      break;
    }
  if (end < 0 || buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6))
    reject("publication-archive-rejected");
  const count = buffer.readUInt16LE(end + 10),
    offset = buffer.readUInt32LE(end + 16),
    length = buffer.readUInt32LE(end + 12);
  if (
    !count ||
    count > limits.entries ||
    count !== buffer.readUInt16LE(end + 8) ||
    offset + length !== end
  )
    reject("publication-archive-rejected");
  const entries = new Map(),
    ranges = [];
  let cursor = offset,
    inflated = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || buffer.readUInt32LE(cursor) !== 0x02014b50)
      reject("publication-archive-rejected");
    const flags = buffer.readUInt16LE(cursor + 8),
      method = buffer.readUInt16LE(cursor + 10),
      compressed = buffer.readUInt32LE(cursor + 20),
      size = buffer.readUInt32LE(cursor + 24),
      names = buffer.readUInt16LE(cursor + 28),
      extra = buffer.readUInt16LE(cursor + 30),
      comments = buffer.readUInt16LE(cursor + 32),
      local = buffer.readUInt32LE(cursor + 42),
      mode = buffer.readUInt32LE(cursor + 38) >>> 16;
    const next = cursor + 46 + names + extra + comments;
    if (
      next > end ||
      flags & ~0x0808 ||
      ![0, 8].includes(method) ||
      (mode & 0xf000) === 0xa000 ||
      (inflated += size) > limits.inflated
    )
      reject("publication-archive-rejected");
    const name = buffer
      .subarray(cursor + 46, cursor + 46 + names)
      .toString("utf8");
    if (
      !/^[A-Za-z0-9._/-]+$/.test(name) ||
      name.startsWith("/") ||
      name.split("/").includes("..") ||
      name.includes("//") ||
      entries.has(name) ||
      (allowed && !allowed(name))
    )
      reject("publication-archive-path-rejected");
    if (
      local + 30 > offset ||
      buffer.readUInt32LE(local) !== 0x04034b50 ||
      buffer.readUInt16LE(local + 6) !== flags ||
      buffer.readUInt16LE(local + 8) !== method
    )
      reject("publication-archive-rejected");
    if (
      (!(flags & 8) &&
        (buffer.readUInt32LE(local + 18) !== compressed ||
          buffer.readUInt32LE(local + 22) !== size)) ||
      (method === 0 && compressed !== size)
    )
      reject("publication-archive-rejected");
    const localNames = buffer.readUInt16LE(local + 26),
      localExtra = buffer.readUInt16LE(local + 28),
      start = local + 30 + localNames + localExtra;
    if (
      start + compressed > offset ||
      buffer.subarray(local + 30, local + 30 + localNames).toString("utf8") !==
        name
    )
      reject("publication-archive-rejected");
    ranges.push([local, start + compressed]);
    entries.set(name, { start, compressed, size, method });
    cursor = next;
  }
  ranges.sort((a, b) => a[0] - b[0]);
  if (cursor !== end || ranges.some((r, n) => n && r[0] < ranges[n - 1][1]))
    reject("publication-archive-rejected");
  const read = (name, max = limits.json) => {
    const entry = entries.get(name);
    if (!entry || !entry.size || entry.size > max)
      reject("publication-artifact-entry-unavailable");
    const raw = buffer.subarray(entry.start, entry.start + entry.compressed);
    const data =
      entry.method === 0 ? raw : inflateRawSync(raw, { maxOutputLength: max });
    if (data.length !== entry.size) reject("publication-archive-rejected");
    return data;
  };
  read.paths = [...entries.keys()];
  return read;
}
