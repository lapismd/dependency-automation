// Controlled source Git/config read ports only. Native pnpm is NEVER mocked.
import { mock } from "node:test";
import * as child from "node:child_process";
import * as fs from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const input = JSON.parse(
  fs.readFileSync(process.env.LAPIS_TEST_PROJECTION_PORT, "utf8"),
);
let capabilityBytes = input.capabilityBytes;
const changed = () =>
  Object.keys(input.before).filter(
    (p) => fs.readFileSync(resolve(input.root, p), "utf8") !== input.before[p],
  );
mock.module("node:child_process", {
  namedExports: {
    ...child,
    execFileSync(file, args, options) {
      if (file !== "git") {
        const output = child.execFileSync(file, args, options);
        if (file === process.execPath && args.includes("update")) {
          if (input.portMutation === "revoke-capability")
            capabilityBytes = '{"schemaVersion":1,"repositories":{}}';
          if (input.portMutation === "private-input-drift")
            fs.appendFileSync(
              resolve(input.root, "scripts/ci-sources.json"),
              "\n",
            );
        }
        return output;
      }
      if (args.join(" ") === "rev-parse HEAD") return input.sourceSha + "\n";
      if (args[0] === "show") {
        const path = args[1].slice(args[1].indexOf(":") + 1);
        if (!(path in input.before))
          throw Error("Missing controlled immutable source file");
        return input.before[path];
      }
      if (args[0] === "ls-tree") {
        if (args.includes("--name-only")) return "";
        const path = args.at(-1),
          bytes = input.before[path];
        if (bytes === undefined) return "";
        const hash = createHash("sha1")
          .update(`blob ${Buffer.byteLength(bytes)}\0${bytes}`)
          .digest("hex");
        return `100644 blob ${hash}\t${path}\n`;
      }
      if (args[0] === "diff") return changed().join("\n");
      if (args[0] === "ls-files")
        return args.includes("--others")
          ? ""
          : Object.keys(input.before).join("\n");
      throw Error("Unexpected controlled Git read");
    },
  },
});
mock.module("node:fs", {
  namedExports: {
    ...fs,
    readFileSync(path, ...args) {
      const file = path instanceof URL ? fileURLToPath(path) : String(path);
      if (file === input.capabilityPath) return capabilityBytes;
      return fs.readFileSync(path, ...args);
    },
  },
});
