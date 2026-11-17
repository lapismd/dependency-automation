import test from "node:test";
import assert from "node:assert/strict";
import { publicArtifact, limits } from "../src/publication-transport.mjs";
import { zip } from "./publication-source-fixtures.mjs";

test("a multi-package public static batch has a separate bounded aggregate budget", () => {
  assert.equal(limits.artifact, 8 * 1024 * 1024);
  assert.equal(limits.tarball, 4 * 1024 * 1024);
  assert.equal(limits.inflated, 32 * 1024 * 1024);
  assert.equal(limits.totalBytes, 128 * 1024 * 1024);
  const archive = zip({
    "npm/first.tgz": Buffer.alloc(16 * 1024 * 1024, 1),
    "npm/second.tgz": Buffer.alloc(10 * 1024 * 1024, 2),
  });
  const read = publicArtifact(
    archive,
    (name) => /^npm\/[a-z]+\.tgz$/.test(name),
    64 * 1024 * 1024,
    "plugins-static-v1",
  );
  assert.equal(
    read("npm/first.tgz", 16 * 1024 * 1024).length,
    16 * 1024 * 1024,
  );
  assert.throws(
    () => read("npm/first.tgz", limits.tarball),
    /entry-unavailable/,
  );
  assert.throws(() => publicArtifact(archive), /archive-rejected/);
  assert.throws(
    () => publicArtifact(archive, undefined, 64 * 1024 * 1024),
    /archive-rejected/,
  );
  assert.throws(
    () => publicArtifact(archive, undefined, 64 * 1024 * 1024, "other"),
    /archive-rejected/,
  );
});
