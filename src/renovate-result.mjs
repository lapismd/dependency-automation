export function renovateResultFailure(line) {
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    return null;
  }
  if (
    row?.msg !== "Repository finished" ||
    typeof row.result !== "string" ||
    !/(?:^|-)error$/.test(row.result)
  )
    return null;
  const repository =
    typeof row.repository === "string" && row.repository
      ? row.repository
      : "unknown repository";
  return `${repository}: ${row.result}`;
}
