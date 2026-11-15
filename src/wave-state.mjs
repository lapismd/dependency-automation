import { requestJson } from "./github.mjs";
import { emptyState, identity, validateState } from "./waves.mjs";

export const stateRepository = "lapismd/dependency-automation";
export const stateBranch = "automation/dependency-wave-state";
const base = `https://api.github.com/repos/${stateRepository}`;

export async function readWaveState(options = {}) {
  const ref = await requestJson(`${base}/git/ref/heads/${stateBranch}`, {
    ...options,
    allow404: true,
  });
  if (!ref) return { revision: null, state: emptyState() };
  const commit = await requestJson(
    `${base}/git/commits/${ref.object.sha}`,
    options,
  );
  const tree = await requestJson(
    `${base}/git/trees/${commit.tree.sha}`,
    options,
  );
  if (
    tree.truncated ||
    tree.tree.some((file) => !["waves.json", "report.json"].includes(file.path))
  )
    throw Error("Unexpected operational state tree; preserve manual work");
  const file = tree.tree.find(
    (f) => f.path === "waves.json" && f.type === "blob",
  );
  if (!file) throw Error("Invalid wave state tree");
  const blob = await requestJson(`${base}/git/blobs/${file.sha}`, options);
  return {
    revision: ref.object.sha,
    state: validateState(
      JSON.parse(Buffer.from(blob.content, "base64").toString("utf8")),
    ),
  };
}

export async function publishWaveState(
  candidate,
  expectedRevision,
  options = {},
) {
  validateState(candidate);
  if (
    !options.enabled ||
    options.repository !== stateRepository ||
    options.ref !== "refs/heads/main" ||
    !["workflow_dispatch", "schedule", "repository_dispatch"].includes(
      options.event,
    )
  )
    throw Error("Wave state writes require explicit trusted-main activation");
  if (
    !options.report ||
    options.report.policyRevision !== candidate.policyRevision ||
    options.report.generation !== candidate.generation ||
    options.report.reportId !==
      identity(
        Object.fromEntries(
          Object.entries(options.report).filter(([key]) => key !== "reportId"),
        ),
      )
  )
    throw Error("State report identity mismatch");
  const before = await readWaveState(options);
  if (
    before.revision !== expectedRevision ||
    candidate.generation !== before.state.generation + 1
  )
    throw Error("Wave state conflict; re-inventory, do not retry candidate");
  const write = async (path, body, method = "POST") => {
    const response = await (options.fetcher ?? fetch)(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${options.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw Error(
        `State write rejected (${response.status}); reconcile before retry`,
      );
    return response.json();
  };
  // Unreferenced objects are harmless if a later operation fails. Only the final
  // non-force ref write publishes state, with the expected revision as parent.
  const blob = await write("/git/blobs", {
    content: JSON.stringify(candidate) + "\n",
    encoding: "utf-8",
  });
  const reportBlob = await write("/git/blobs", {
    content: JSON.stringify(options.report) + "\n",
    encoding: "utf-8",
  });
  const tree = await write("/git/trees", {
    tree: [
      { path: "waves.json", mode: "100644", type: "blob", sha: blob.sha },
      {
        path: "report.json",
        mode: "100644",
        type: "blob",
        sha: reportBlob.sha,
      },
    ],
  });
  const commit = await write("/git/commits", {
    message: `Reconcile wave state ${candidate.generation}`,
    tree: tree.sha,
    parents: expectedRevision ? [expectedRevision] : [],
  });
  try {
    if (expectedRevision)
      await write(
        `/git/refs/heads/${stateBranch}`,
        { sha: commit.sha, force: false },
        "PATCH",
      );
    else
      await write("/git/refs", {
        ref: `refs/heads/${stateBranch}`,
        sha: commit.sha,
      });
  } catch {
    const observed = await readWaveState(options);
    if (
      observed.revision === commit.sha &&
      identity(observed.state) === identity(candidate)
    )
      return { status: "accepted-after-readback", revision: commit.sha };
    throw Error(
      "Uncertain/conflicting wave state write; re-inventory before any consumer write",
    );
  }
  const observed = await readWaveState(options);
  if (
    observed.revision !== commit.sha ||
    identity(observed.state) !== identity(candidate)
  )
    throw Error("Wave state read-back mismatch; consumer writes held");
  return { status: "accepted", revision: commit.sha };
}
