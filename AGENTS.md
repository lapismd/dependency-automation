# Dependency automation

This private npm workspace owns cross-repository dependency update tooling,
not application source, package publication, signing, or deployment. Compatible
dependency PRs may auto-merge only after CI succeeds and repository rules allow it;
major and 0.x minor updates remain draft PRs for manual review.

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

## Canonical specification

Apply the authority order: workspace/repository guidance, owning `DA-<AREA>-NNN`
requirement in `spec/src`, source/public contracts and tests, then README and
rollout records. Update the mapped chapter and verification evidence before or
with protected changes. `spec-validator.config.mjs` owns the path map; unmapped
protected paths fail closed.

Use `pnpm spec:search "topic or DA-ID"` before broad specification scans; use
`--semantic` for conceptual discovery. QMD hits are a cache: open the returned
canonical file before editing. Use the CLI's reported rg fallback only when
QMD is unavailable. Run `spec-validator doctor` and a QMD search for local wiring.
Keep QMD/model downloads outside CI. Run `pnpm spec:check` and `pnpm verify`
before the standing Jujutsu commit of each verified slice.

Keep generated `spec/book/`, QMD databases and `reports/` untracked. Public Pages
delivery uploads only the generated canonical book; never include operational
reports, caches, credentials or the whole checkout. Planned S3–S6 features in
`PLAN.md` are not claims of implemented behavior.
