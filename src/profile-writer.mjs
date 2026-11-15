import { profileNotes, updateProfileBody } from "./pr-messages.mjs";

const bots = new Set(["github-actions[bot]", "lapismd-dependency-bot[bot]"]);
const branch = "automation/npm-status-refresh";
const repository = "lapismd/.github";
const version =
  "[0-9]+\\.[0-9]+\\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?";

function requireValue(condition, reason) {
  if (!condition) throw Error(reason);
}

// The source repository owns generation. This boundary accepts only its public
// npm cell grammar, never executable artifacts or arbitrary Markdown edits.
export function validateProfile(before, after, packages) {
  requireValue(
    typeof after === "string" && Buffer.byteLength(after) <= 262144,
    "Invalid profile size",
  );
  const original = before.split("\n"),
    candidate = after.split("\n");
  requireValue(
    original.length === candidate.length,
    "Profile line count changed",
  );
  const seen = new Set();
  original.forEach((line, index) => {
    const next = candidate[index];
    if (!line.startsWith("|")) {
      requireValue(next === line, "Non-table profile content changed");
      return;
    }
    const cells = line.split("|").map((cell) => cell.trim());
    const updated = next.split("|").map((cell) => cell.trim());
    requireValue(
      cells.length === 5 && updated.length === 5 && !updated[0] && !updated[4],
      "Invalid profile table",
    );
    if (cells.slice(1, 4).every((cell) => /^-+$/.test(cell))) {
      requireValue(
        updated.slice(1, 4).every((cell) => /^-+$/.test(cell)),
        "Table separator changed",
      );
      return;
    }
    requireValue(
      cells[1] === updated[1] && cells[2] === updated[2],
      "Repository or build cell changed",
    );
    const name = cells[1].match(
      /\]\(https:\/\/github\.com\/lapismd\/([^/)]+)\)/,
    )?.[1];
    if (!name || !Object.hasOwn(packages, name)) {
      requireValue(cells[3] === updated[3], "Unconfigured cell changed");
      return;
    }
    requireValue(!seen.has(name), "Duplicate repository row");
    seen.add(name);
    const statuses = updated[3].split("<br>");
    requireValue(
      statuses.length === packages[name].length,
      "Package count changed",
    );
    packages[name].forEach((pkg, item) => {
      requireValue(
        /^@[a-z0-9._-]+\/[a-z0-9._-]+$/.test(pkg),
        "Invalid configured package",
      );
      const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const published = new RegExp(
        `^Published: \\[${escaped}\\]\\(https://www\\.npmjs\\.com/package/${escaped}\\) \\*\\*(?:v${version}|No latest tag)\\*\\*$`,
      );
      requireValue(
        statuses[item] === `${pkg} — **Not published**` ||
          published.test(statuses[item]),
        "Invalid npm status cell",
      );
    });
  });
  requireValue(
    Object.keys(packages).every((name) => seen.has(name)),
    "Missing configured repository",
  );
  return before !== after;
}

export async function publishProfile({
  api,
  sourceSha,
  candidate,
  now = new Date().toISOString(),
}) {
  requireValue(/^[a-f0-9]{40}$/.test(sourceSha), "Invalid source revision");
  const main = () => api("git/ref/heads/main");
  requireValue(
    (await main()).object.sha === sourceSha,
    "Source main changed; regenerate",
  );
  const read = async (path) => {
    const blob = await api(`contents/${path}?ref=${sourceSha}`);
    requireValue(blob.encoding === "base64", "Unsupported content encoding");
    return Buffer.from(blob.content, "base64").toString("utf8");
  };
  const before = await read("profile/README.md");
  const packages = JSON.parse(await read("profile/packages.json"));
  if (!validateProfile(before, candidate, packages))
    return { state: "unchanged" };
  const prs = await api(
    `pulls?state=open&head=lapismd:${branch}&base=main&per_page=2`,
  );
  requireValue(prs.length <= 1, "Ambiguous rolling PR");
  const pr = prs[0];
  let head;
  if (pr) {
    requireValue(
      pr.head.repo.full_name === repository && bots.has(pr.user.login),
      "Rolling PR is repair-owned",
    );
    head = pr.head.sha;
    const comparison = await api(`compare/${sourceSha}...${head}`);
    requireValue(
      comparison.total_commits > 0 &&
        comparison.total_commits <= 100 &&
        comparison.commits.length === comparison.total_commits,
      "Incomplete branch history",
    );
    requireValue(
      comparison.commits.every((commit) => bots.has(commit.author?.login)),
      "Manual repair commits preserved; operator action needed",
    );
    requireValue(
      comparison.files.length > 0 &&
        comparison.files.every(
          (file) =>
            file.filename === "profile/README.md" && file.status === "modified",
        ),
      "Unexpected rolling branch files",
    );
    requireValue(
      (await api(`git/ref/heads/${branch}`)).object.sha === head,
      "Rolling branch changed; reconcile",
    );
    const existing = await api(`contents/profile/README.md?ref=${head}`);
    requireValue(existing.encoding === "base64", "Unsupported branch encoding");
    if (
      Buffer.from(existing.content, "base64").toString("utf8") === candidate &&
      pr.user.login === "lapismd-dependency-bot[bot]" &&
      comparison.status === "ahead" &&
      comparison.commits.at(-1).author.login === "lapismd-dependency-bot[bot]"
    )
      return { state: "pending", number: pr.number, sha: head };
  } else {
    const existing = await api(
      `git/ref/heads/${branch}`,
      "GET",
      undefined,
      true,
    );
    if (existing) {
      const closed = await api(
        `pulls?state=closed&head=lapismd:${branch}&base=main&per_page=100`,
      );
      requireValue(
        closed.some(
          (previous) =>
            previous.merged_at &&
            previous.head.sha === existing.object.sha &&
            previous.head.repo?.full_name === repository &&
            bots.has(previous.user.login),
        ),
        "Existing branch without a matching merged bot PR requires reconciliation",
      );
      head = existing.object.sha;
    }
  }
  // Reject ambiguous managed text before any branch write. Ordinary identical
  // candidates returned above remain GET-only, even with an old description.
  const describe = (candidateSha, body = pr?.body ?? "") =>
    updateProfileBody(
      body,
      profileNotes({ before, candidate, sourceSha, candidateSha, now }),
    );
  describe(sourceSha);
  const base = await api(`git/commits/${sourceSha}`);
  const tree = await api("git/trees", "POST", {
    base_tree: base.tree.sha,
    tree: [
      {
        path: "profile/README.md",
        mode: "100644",
        type: "blob",
        content: candidate,
      },
    ],
  });
  const commit = await api("git/commits", "POST", {
    message: "Refresh npm publication status and versions",
    tree: tree.sha,
    parents: [...new Set(head ? [head, sourceSha] : [sourceSha])],
  });
  requireValue(
    (await main()).object.sha === sourceSha,
    "Main changed before publication; regenerate",
  );
  if (head) {
    await api(`git/refs/heads/${branch}`, "PATCH", {
      sha: commit.sha,
      force: false,
    });
  } else {
    await api("git/refs", "POST", {
      ref: `refs/heads/${branch}`,
      sha: commit.sha,
    });
  }
  // Complete the one-time creator handover so qualification includes an
  // App-created PR, after validating and updating the legacy PR's head.
  // Closing/replacing keeps the branch history and leaves ordinary CI intact.
  const legacy = pr?.user.login === "github-actions[bot]";
  if (legacy) await api(`pulls/${pr.number}`, "PATCH", { state: "closed" });
  const result =
    (legacy ? undefined : pr) ??
    (await api("pulls", "POST", {
      head: branch,
      base: "main",
      title: "Refresh npm publication status and versions",
      body: describe(commit.sha),
    }));
  if (pr && !legacy) {
    // Read again after publication to retain prose added during preparation.
    // Uncertain/invalid updates stop; no automatic write retry is permitted.
    const current = await api(`pulls/${pr.number}`);
    requireValue(
      current.user?.login === pr.user.login &&
        current.head?.repo?.full_name === repository &&
        current.head?.sha === commit.sha,
      "Profile review ownership changed; reconcile description manually",
    );
    const body = describe(commit.sha, current.body ?? "");
    if (body !== current.body)
      await api(`pulls/${pr.number}`, "PATCH", { body });
  }
  return { state: "published", number: result.number, sha: commit.sha };
}
