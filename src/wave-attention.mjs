const summary = (value, limit = 180) => {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
};

const base = (node) => ({
  repository: node.repository,
  sourceSha: node.sourceSha,
});

function sourceFact(node, fact) {
  const name = fact.name ?? "Registry prerequisite";
  const unpublished = fact.kind === "unpublished-registry";
  return {
    code: fact.kind,
    category: "publication",
    summary: unpublished
      ? `${name} is not published`
      : `${name} is unavailable for this consumer`,
    detail: fact.message,
    remediation: `Qualify or publish ${name}, then refresh coordinator evidence.`,
    ...base(node),
    ...(fact.name ? { package: fact.name } : {}),
    ...(fact.path ? { path: fact.path } : {}),
  };
}

function hold(node, detail) {
  if (/outside pilot phase/i.test(detail))
    return {
      code: "rollout-phase",
      category: "rollout",
      summary: "Requires full rollout",
      detail,
      remediation:
        "Review pilot evidence and explicitly promote the rollout phase.",
      ...base(node),
    };
  if (
    /source-owned canonical preparation|preparation does not support/i.test(
      detail,
    )
  )
    return {
      code: "source-preparation",
      category: "source-preparation",
      summary: "Source preparation does not support this update",
      detail,
      remediation:
        "Extend the repository's canonical preparation contract or split this update into a supported set.",
      ...base(node),
    };
  if (
    /excluded .*deno|writes are not authorized|graph observation only/i.test(
      detail,
    )
  )
    return {
      code: "policy-exclusion",
      category: "policy-exclusion",
      summary: "Dependency writes are excluded by policy",
      detail,
      remediation:
        "Review the repository exclusion policy before enabling dependency writes.",
      ...base(node),
    };
  if (
    /previous admission .* has no observed PR|reconcile operation before retry/i.test(
      detail,
    )
  )
    return {
      code: "operation-reconciliation",
      category: "branch-reconciliation",
      summary: "Dependency operation requires reconciliation",
      detail,
      remediation:
        "Reconcile or supersede the exact prior operation before retrying dependency writes.",
      ...base(node),
    };
  if (/retained branch|repair-owned branch|reconcil/i.test(detail))
    return {
      code: "branch-reconciliation",
      category: "branch-reconciliation",
      summary: "Dependency branch requires reconciliation",
      detail,
      remediation:
        "Review the retained branch, then merge it through a pull request or retire it.",
      ...base(node),
    };
  if (
    /unavailable registry|unpublished registry|publication|registry prerequisite/i.test(
      detail,
    )
  )
    return {
      code: "publication-hold",
      category: "publication",
      summary: "Publication prerequisite is not ready",
      detail,
      remediation:
        "Qualify the named publication prerequisite, then refresh coordinator evidence.",
      ...base(node),
    };
  if (/private profile|remains pinned|archive projection/i.test(detail))
    return {
      code: "product-constraint",
      category: "product-constraint",
      summary: "Product qualification remains required",
      detail,
      remediation:
        "Complete the named product qualification before removing its explicit hold.",
      ...base(node),
    };
  return {
    code: "explicit-hold",
    category: "other",
    summary: summary(detail),
    detail,
    remediation:
      "Review this hold in the source repository, then refresh coordinator evidence.",
    ...base(node),
  };
}

function waitAttention(wait) {
  const coordinates = {
    repository: wait.repository,
    package: wait.package,
    ...(wait.path ? { path: wait.path } : {}),
  };
  if (/channel-not-admitted:/i.test(wait.reason))
    return {
      code: "channel-admission",
      category: "publication",
      summary: "Published package requires channel review",
      detail: wait.reason,
      remediation: `Review the exact channel policy for ${wait.package}, then refresh coordinator evidence.`,
      ...coordinates,
    };
  if (/publisher-contract-unreviewed/i.test(wait.reason))
    return {
      code: "publisher-policy",
      category: "publication",
      summary: "Publisher contract requires review",
      detail: wait.reason,
      remediation: `Review and qualify the publisher policy for ${wait.package}, then refresh coordinator evidence.`,
      ...coordinates,
    };
  return {
    code: "upstream-publication",
    category: "publication",
    summary: `Waiting for ${wait.package}`,
    detail: wait.reason,
    remediation: `Complete qualification or publication in ${wait.repository}, then refresh coordinator evidence.`,
    ...coordinates,
  };
}

/** Public presentation projection only. It never grants command authority. */
export function nodeAttention(node) {
  const result = [];
  const facts = new Set(
    (node.sourceHoldFacts ?? []).map((fact) => fact.message),
  );
  for (const detail of node.holds ?? [])
    if (!facts.has(detail)) result.push(hold(node, detail));
  for (const fact of node.sourceHoldFacts ?? [])
    result.push(sourceFact(node, fact));
  for (const branch of node.branchHolds ?? [])
    result.push({
      code: "branch-reconciliation",
      category: "branch-reconciliation",
      summary: "Dependency branch requires reconciliation",
      detail: branch.reason,
      remediation:
        "Review the retained branch, then merge it through a pull request or retire it.",
      repository: node.repository,
      sourceSha: branch.head,
      branch: branch.branch,
    });
  const waits = new Set();
  for (const wait of node.waits ?? []) {
    const id = `${wait.repository}\0${wait.package}\0${wait.reason}`;
    if (waits.has(id)) continue;
    waits.add(id);
    result.push(waitAttention(wait));
  }
  if (node.ownership?.state === "repair-owned")
    result.push({
      code: "repair-ownership",
      category: "branch-reconciliation",
      summary: "Manual repair ownership",
      detail: node.ownership.reason,
      remediation:
        "Review the manually owned branch and reconcile it without overwriting maintainer work.",
      ...base(node),
    });
  if (node.acceptance?.state !== "qualified")
    result.push({
      code: "source-qualification",
      category: "qualification",
      summary: summary(node.acceptance.reason),
      detail: node.acceptance.reason,
      remediation:
        "Open current checks, resolve the failing or incomplete run, then refresh coordinator evidence.",
      ...base(node),
    });
  return result.slice(0, 128);
}
