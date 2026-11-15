import { mkdir, writeFile } from "node:fs/promises";
import { auditPreflight } from "../src/audit-preflight.mjs";
const result = await auditPreflight();
await mkdir("reports", { recursive: true });
await writeFile(
  "reports/advisory-preflight.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  `Coordinator audit write admission: ${result.allowed ? "qualified" : "held"}`,
);
if (!result.allowed) process.exitCode = 1;
