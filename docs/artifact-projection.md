# Inactive seeded SDK artifacts

This capability is **off for every live repository**. The trusted coordinator
map at `config/artifact-projections.json` has no entries. Source data alone
cannot grant generation, remove a private hold or enable a repository. Desktop's
source-owned eight-archive installation, functional checks and audits remain
separate mandatory gates. A projected tooling install is not a production audit.

The current immutable Desktop source already uses Spec Validator0.2.1. This
capability does not create a newer version, publication or real bot update.

## Source descriptor

After this implementation is reviewed, a separate owning-source change may add
`.github/dependency-automation/artifact-projection.json` with exactly:

```json
{
  "schemaVersion": 1,
  "kind": "seeded-sdk-development-lock",
  "repository": "lapismd/lapis-desktop",
  "dependency": "@lapismd/spec-validator",
  "immutableShapeSha256": "<64 lowercase hex characters>"
}
```

No executable, command, archive path, profile path or tool selector is accepted.
The source keeps its existing canonical-v1 SDK profile and independent normal
functional checks. A later separate operator decision must also install the
exact raw descriptor SHA256 under this repository in the trusted capability map.
Neither opt-in supersedes normal admission, source acceptance or any hold.

`immutableProjectionShape(inputs)` reads exactly these immutable source files:

1. `package.json`
2. `pnpm-workspace.yaml`
3. `pnpm-lock.yaml`
4. `scripts/ci-sources.json`
5. `.github/ci-docs/package.json`

The SHA256 hashes recursively key-sorted JSON containing parsed manifest,
workspace and portable lock, plus SHA256 of the **exact raw bytes** of both
private-inventory and nested CI-docs files. Arrays keep their order. Only the
selected root SDK dev value, exact importer specifier/version, existing SDK
overrides, selected package/snapshot key version and selected registry integrity
normalize to `<selected>`. All other fields and rows, including shared jiti and
TypeScript definitions/snapshots and nested CI-docs SDK0.2.0, remain unchanged.
No generic peer-context hashes, unrelated code files or arbitrary paths normalize.
Missing/duplicate/ambiguous inputs and unsupported resolution policy fail closed.

## Generation and copyback

For an otherwise qualified canonical-v1 patch, the two opt-ins select only
`custom.regex` extraction from the exact root SDK development field. The normal
npm manager is unchanged for every other profile. No global install or artifact
skip flag is used. Real pinned Renovate performs the package-file update and
invokes its existing trusted post-upgrade command.

The shared Node generator seeds the existing SDK/jiti/TypeScript closure from
that same full portable lock. It does not resolve an unrelated latest graph.
Native pnpm10.34.5 runs under Node24.15.0 using the existing prepared official
JavaScript tool, with its reviewed bundle hash checked before execution. Missing
or changed tool bytes fail; the generator installs no replacement tool.

The temporary context has only generated data, a public npm registry, explicit
public/empty npm configuration, an isolated public store and an environment
allowlist. It disables scripts, pnpmfile hooks and tool-version management and
never copies source hooks, private archives, credentials or user profiles. HOME
is not repurposed. Native update and frozen projection installation must pass.

Copyback accepts only the selected SDK's native importer/definition/snapshot
blocks and an existing override scalar. YAML node ranges preserve all unrelated
full-lock bytes. Target integrity and compatible forward-patch identity must
agree with the admitted registry facts; changed shared or transitive metadata
is held by this initial profile. Every immutable binding is rechecked before
writes. The existing canonical preparation, tooling guard and final candidate
checks still run; post-upgrade collection retains exactly the governed outputs.
An actual same-version no-op returns all original full input bytes.

The historical0.2.0→0.2.1 fixture proves native patch mechanics. The controlled
Renovate regression adds test-only canonical/capability data over genuine
historical package inputs and mocks only Git/config/SCM transport ports; native
pnpm and Renovate extraction/artifact/post-task/commit code execute for real.
Neither test claims a current Desktop bot E2E or activates private eligibility.

The separate [inactive SDK scope](scoped-sdk-admission.md) MAY select a bounded
view only after another explicit operator grant and source acceptance. Artifact
authority alone still removes no hold or update prerequisite.
