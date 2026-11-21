export function renovateResultFailure(line) {
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    return null;
  }
  const repository =
    typeof row.repository === "string" && row.repository
      ? row.repository
      : "unknown repository";
  if (
    row?.msg === "artifactErrors" &&
    Array.isArray(row.artifactErrors) &&
    row.artifactErrors.length
  )
    return `${repository}: artifact-errors`;
  if (
    row?.msg === "Repository finished" &&
    typeof row.result === "string" &&
    /(?:^|-)error$/.test(row.result)
  )
    return `${repository}: ${row.result}`;
  return null;
}
