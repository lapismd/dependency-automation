import { intakeHash } from "./canonical-intake.mjs";

export function workspaceIntakeSlot(policy, facts) {
  const rows = [];
  for (const [path, entry] of Object.entries(facts.manifests))
    for (const [type, group] of Object.entries(entry))
      for (const [name, fact] of Object.entries(group))
        rows.push(
          `| \`${path}\` (${type}) | \`${name}\` | \`${fact.range.replaceAll("|", "\\|")}\` | ${fact.version ? `\`${fact.version}\`` : "Peer support"} |`,
        );
  return [
    `<!-- dependency-intake:${policy.slot}:start -->`,
    "",
    "Current registry dependency coordinates; qualification remains separate.",
    "",
    "<!-- prettier-ignore -->",
    "| Manifest | Dependency | Range | Locked version |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    `Manifest, peer and integrity facts SHA256: \`${intakeHash(JSON.stringify(facts))}\`.`,
    "",
    `<!-- dependency-intake:${policy.slot}:end -->`,
  ].join("\n");
}

const wrappedDigest = (slot) =>
  slot.replace(
    /^Manifest, peer and integrity facts SHA256: (`[a-f0-9]{64}`\.)$/m,
    "Manifest, peer and integrity facts SHA256:\n$1",
  );
export function prepareWorkspaceIntakeSlot(policy, previous, facts, source) {
  const expected = workspaceIntakeSlot(policy, previous);
  const next = workspaceIntakeSlot(policy, facts);
  if (source === expected) return next;
  if (source === wrappedDigest(expected)) return wrappedDigest(next);
  throw Error(
    "Canonical intake held: stale or manually changed workspace facts",
  );
}
