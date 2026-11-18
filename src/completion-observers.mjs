export function validateHeldCompletionObservers(
  policy,
  entries,
  excluded = [],
) {
  const fail = () => {
    throw Error("invalid-completion-policy");
  };
  const observers = policy.heldObservers ?? [];
  if (!Array.isArray(observers) || new Set(observers).size !== observers.length)
    fail();
  const excludedRoots = new Set(excluded);
  for (const repository of Object.keys(policy.repositories))
    if (excludedRoots.has(repository)) fail();
  for (const repository of observers)
    if (
      !Object.hasOwn(policy.repositories, repository) ||
      !entries.some(
        (entry) =>
          entry.repository === repository &&
          entry.phase === "full" &&
          typeof entry.holdReason === "string" &&
          entry.holdReason.trim(),
      )
    )
      fail();
  return new Set(observers);
}
