# Dependency automation

This private npm workspace owns cross-repository dependency update tooling,
not application source, package publication, signing, merging, or deployment.

- Use Jujutsu and preserve unrelated work. Commit verified slices unsigned.
- Keep all workflow actions and tools pinned. Default to dry-run mode.
- Never enable repository writes or change rollout phases without an explicit
  operator decision after the pilot has been reviewed.
- Treat release notifications as hints. npm metadata owns available versions.
- Derive consumers from active workspace manifests; do not track dependency
  edges manually. Exclude parked packages, fixtures and generated trees.
- Keep dependency-bot spec exemptions separate from functional validation.
- Run `pnpm verify`, `actionlint`, Renovate configuration validation, and the
  read-only registry inventory before handing off changes.
- Never commit tokens, GitHub App private keys, or credential-bearing URLs.
