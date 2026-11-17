import { createHash } from "node:crypto";
import { httpResponseError } from "./github-response.mjs";

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 256;
const MAX_TOTAL_BYTES = 16 * 1024 * 1024;
const hash = (bytes) =>
  createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
const pathAllowed = (file) =>
  typeof file === "string" &&
  file.length > 0 &&
  !/[\\\x00-\x1f]/.test(file) &&
  file.split("/").every((part) => part && part !== "." && part !== "..");

/** Only the caller's verified-public tree can authorize a source-file read. */
export function publicSourceFileReader(
  repository,
  revision,
  tree,
  { fetcher = fetch } = {},
) {
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
    repository.split("/").some((part) => part === "." || part === "..") ||
    !/^[a-f0-9]{40}$/.test(revision) ||
    !Array.isArray(tree)
  )
    throw Error(
      "Public source requires exact immutable repository/tree coordinates",
    );
  const blobs = new Map();
  for (const item of tree.filter((item) => item.type === "blob")) {
    if (blobs.has(item.path)) throw Error("Duplicate public source tree path");
    blobs.set(item.path, item.sha);
  }
  const cache = new Map();
  let totalBytes = 0;
  async function read(file, blob) {
    const url = `https://raw.githubusercontent.com/${repository}/${revision}/${file.split("/").map(encodeURIComponent).join("/")}`;
    const response = await fetcher(url, {
      headers: { Accept: "application/octet-stream" },
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw httpResponseError(url, response);
    }
    if (response.redirected) {
      await response.body?.cancel();
      throw Error("Redirected public source is held");
    }
    const declared = response.headers?.get?.("content-length");
    if (
      declared !== null &&
      declared !== undefined &&
      (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)
    ) {
      await response.body?.cancel();
      throw Error("Public source response exceeds its byte bound");
    }
    const chunks = [];
    let size = 0;
    if (response.body) {
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          totalBytes += value.byteLength;
          if (size > MAX_BYTES || totalBytes > MAX_TOTAL_BYTES) {
            await reader.cancel();
            throw Error("Public source response exceeds its byte bound");
          }
          chunks.push(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }
    }
    const bytes = Buffer.concat(chunks, size);
    if (hash(bytes) !== blob)
      throw Error("Public source Git blob identity mismatch");
    return bytes.toString("utf8");
  }
  return async (file) => {
    const blob = blobs.get(file);
    if (!pathAllowed(file) || !/^[a-f0-9]{40}$/.test(blob ?? ""))
      throw Error("Public source path lacks an exact Git blob identity");
    if (!cache.has(file)) {
      if (totalBytes >= MAX_TOTAL_BYTES)
        throw Error("Public source response exceeds its byte bound");
      if (cache.size >= MAX_FILES)
        throw Error("Public source file request budget exhausted");
      cache.set(file, read(file, blob));
    }
    return cache.get(file);
  };
}
