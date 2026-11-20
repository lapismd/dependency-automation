import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { renovateResultFailure } from "../src/renovate-result.mjs";

const failures = new Set();
const renovate = fileURLToPath(
  new URL("../node_modules/renovate/dist/renovate.js", import.meta.url),
);
const child = spawn(process.execPath, [renovate], {
  env: { ...process.env, LOG_FORMAT: "json" },
  stdio: ["ignore", "pipe", "pipe"],
});

function forward(stream, output) {
  let buffered = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    output.write(chunk);
    buffered += chunk;
    const lines = buffered.split("\n");
    buffered = lines.pop();
    for (const line of lines) {
      const failure = renovateResultFailure(line);
      if (failure) failures.add(failure);
    }
  });
  stream.on("end", () => {
    if (!buffered) return;
    const failure = renovateResultFailure(buffered);
    if (failure) failures.add(failure);
  });
}

forward(child.stdout, process.stdout);
forward(child.stderr, process.stderr);

const result = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", (code, signal) => resolve({ code, signal }));
});
if (result.signal)
  throw Error(`Renovate terminated by signal ${result.signal}`);
if (result.code !== 0) throw Error(`Renovate exited with code ${result.code}`);
if (failures.size)
  throw Error(
    `Renovate reported unsuccessful repository result: ${[...failures].join(", ")}`,
  );
