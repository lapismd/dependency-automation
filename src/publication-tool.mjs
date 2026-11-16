import {
  createHash,
  createPublicKey,
  verify as verifySignature,
  X509Certificate,
} from "node:crypto";
import { execFile } from "node:child_process";
import { promisify, isDeepStrictEqual } from "node:util";
import {
  lstat,
  readFile,
  realpath,
  mkdtemp,
  writeFile,
  rm,
} from "node:fs/promises";
import { dirname, join, resolve, delimiter } from "node:path";
import { tmpdir } from "node:os";
const run = promisify(execFile);
export const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = () => {
  throw Error("verification-tool-unavailable");
};
const seedPath = () =>
  resolve(
    dirname(process.execPath),
    "../lib/node_modules/npm/node_modules/@sigstore/tuf/seeds.json",
  );

async function binaryPath() {
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    const path = join(dir, "gh");
    try {
      const actual = await realpath(path);
      if ((await lstat(actual)).isFile()) return actual;
    } catch {
      /* next explicit PATH entry */
    }
  }
  fail();
}
export async function inspectVerificationTool(binary = undefined) {
  const path = binary ?? (await binaryPath()),
    seed = seedPath();
  const stat = await lstat(path);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size > 128 * 1024 * 1024 ||
    (await realpath(seed)) !== seed ||
    (await lstat(seed)).size > 1024 * 1024
  )
    fail();
  return {
    sha256: hash(await readFile(path)),
    trustSeedSha256: hash(await readFile(seed)),
  };
}

// GH exposes all required authenticated certificate claims except deployment
// environment. Read only that sealed UTF8 extension with bounded DER framing.
function environment(raw) {
  const bytes = new X509Certificate(raw).raw;
  function node(offset, end) {
    const start = offset,
      tag = bytes[offset++];
    let size = bytes[offset++];
    if (size & 128) {
      const n = size & 127;
      if (!n || n > 3 || offset + n > end)
        throw Error("publication-certificate-mismatch");
      size = 0;
      for (let i = 0; i < n; i++) size = size * 256 + bytes[offset++];
    }
    if (offset + size > end) throw Error("publication-certificate-mismatch");
    return { start, tag, value: offset, end: offset + size };
  }
  function children(parent) {
    const out = [];
    let offset = parent.value;
    while (offset < parent.end) {
      if (out.length > 128) throw Error("publication-certificate-mismatch");
      const next = node(offset, parent.end);
      out.push(next);
      offset = next.end;
    }
    return out;
  }
  const cert = node(0, bytes.length),
    tbs = children(cert)[0],
    extensions = children(tbs).find((n) => n.tag === 0xa3);
  if (!extensions) throw Error("publication-certificate-mismatch");
  const oid = Buffer.from("2b0601040183bf300117", "hex"),
    matching = [];
  for (const extension of children(children(extensions)[0])) {
    const fields = children(extension);
    if (
      fields[0]?.tag !== 6 ||
      !bytes.subarray(fields[0].value, fields[0].end).equals(oid)
    )
      continue;
    const octets = fields.at(-1);
    if (octets.tag !== 4) throw Error("publication-certificate-mismatch");
    const value = node(octets.value, octets.end);
    if (
      value.tag !== 12 ||
      value.end !== octets.end ||
      value.end - value.value > 128
    )
      throw Error("publication-certificate-mismatch");
    matching.push(bytes.subarray(value.value, value.end).toString("utf8"));
  }
  if (matching.length !== 1) throw Error("publication-certificate-mismatch");
  return matching[0];
}

export async function loadPublicationVerifier(contract) {
  if (
    process.versions.node !== contract.node ||
    process.platform !== "linux" ||
    process.arch !== "x64"
  )
    fail();
  const binary = await binaryPath(),
    actual = await inspectVerificationTool(binary);
  if (
    actual.sha256 !== contract.sha256 ||
    actual.trustSeedSha256 !== contract.trustSeedSha256
  )
    fail();
  const version = await run(binary, ["--version"], {
    timeout: 10000,
    maxBuffer: 4096,
    env: { PATH: "/usr/bin:/bin", GH_PROMPT_DISABLED: "1" },
  });
  if (!version.stdout.startsWith(`gh version ${contract.gh} `)) fail();
  // Public data only; no npm/sigstore JavaScript module is imported or executed.
  const seed = JSON.parse(await readFile(seedPath(), "utf8"))[
    "https://tuf-repo-cdn.sigstore.dev"
  ];
  const trustedRoot = JSON.parse(
    Buffer.from(seed.targets["trusted_root.json"], "base64"),
  );
  const keys = JSON.parse(
    Buffer.from(seed.targets["registry.npmjs.org%2Fkeys.json"], "base64"),
  ).keys;
  return {
    async verify(bundle, request, artifact) {
      if (!Buffer.isBuffer(artifact) || artifact.length > 4 * 1024 * 1024)
        throw Error("publication-subject-mismatch");
      const directory = await mkdtemp(
        join(tmpdir(), "lapis-publication-verify-"),
      );
      try {
        const file = join(directory, "package.tgz"),
          proof = join(directory, "bundle.json"),
          trust = join(directory, "trusted-root.jsonl");
        await Promise.all([
          writeFile(file, artifact, { mode: 0o600 }),
          writeFile(proof, JSON.stringify(bundle), { mode: 0o600 }),
          writeFile(trust, JSON.stringify(trustedRoot) + "\n", { mode: 0o600 }),
        ]);
        const identity = `https://github.com/${request.repository}/${request.workflow}@${request.ref}`;
        const args = [
          "attestation",
          "verify",
          file,
          "--digest-alg",
          "sha512",
          "--bundle",
          proof,
          "--repo",
          request.repository,
          "--predicate-type",
          "https://slsa.dev/provenance/v1",
          "--cert-identity",
          identity,
          "--cert-oidc-issuer",
          "https://token.actions.githubusercontent.com",
          "--source-digest",
          request.sourceSha,
          "--source-ref",
          request.ref,
          "--signer-digest",
          request.sourceSha,
          "--deny-self-hosted-runners",
          "--custom-trusted-root",
          trust,
          "--format",
          "json",
        ];
        const result = await run(binary, args, {
          cwd: directory,
          timeout: 30000,
          maxBuffer: 1024 * 1024,
          env: {
            PATH: "/usr/bin:/bin",
            GH_CONFIG_DIR: directory,
            GH_HOST: "github.com",
            GH_PROMPT_DISABLED: "1",
            NO_COLOR: "1",
          },
        });
        const output = JSON.parse(result.stdout);
        if (
          output.length !== 1 ||
          !output[0].verificationResult?.verifiedTimestamps?.length
        )
          throw Error("provenance-unknown");
        const verified = output[0].verificationResult;
        const statement = JSON.parse(
          Buffer.from(bundle.dsseEnvelope.payload, "base64"),
        );
        if (!isDeepStrictEqual(verified.statement, statement))
          throw Error("publication-subject-mismatch");
        const raw = Buffer.from(
          bundle.verificationMaterial.certificate.rawBytes,
          "base64",
        );
        if (raw.length > 16384) throw Error("publication-certificate-mismatch");
        return {
          ...verified.signature.certificate,
          deploymentEnvironment: environment(raw),
        };
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
    registrySignature(metadata) {
      const message = Buffer.from(
        `${metadata.name}@${metadata.version}:${metadata.dist.integrity}`,
      );
      if (
        !metadata.dist.signatures?.some((signature) => {
          const key = keys.find(
            (k) =>
              k.keyId === signature.keyid && k.keyUsage === "npm:signatures",
          );
          const range = key?.publicKey.validFor,
            now = new Date();
          if (
            !key ||
            (range?.start && now < new Date(range.start)) ||
            (range?.end && now > new Date(range.end))
          )
            return false;
          const publicKey = createPublicKey({
            key: Buffer.from(key.publicKey.rawBytes, "base64"),
            type: "spki",
            format: "der",
          });
          return verifySignature(
            "sha256",
            message,
            publicKey,
            Buffer.from(signature.sig, "base64"),
          );
        })
      )
        throw Error("registry-signature-unknown");
    },
  };
}
