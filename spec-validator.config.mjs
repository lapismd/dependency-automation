import {
  defineConfig,
  headingRequirements,
  singleIdVerification,
} from "@lapismd/spec-validator";

export default defineConfig(headingRequirements(), {
  name: "dependency-automation",
  idPattern: /^DA-[A-Z]+-\d{3}$/,
  ruleIds: {
    summary: "DA-GOV-001",
    governance: "DA-GOV-001",
    verification: "DA-GOV-002",
    book: "DA-DOC-001",
    bookIgnore: "DA-GOV-004",
    qmd: "DA-GOV-003",
    specFirst: "DA-GOV-003",
    internal: "DA-GOV-001",
  },
  validators: {
    summary: true,
    governance: { extras: ["AGENTS.md", "README.md"] },
    verification: singleIdVerification({
      statuses: ["Implemented", "In progress", "Planned"],
    }),
    book: true,
    qmd: {
      collection: "dependency-automation-spec",
      configPath: ".qmd/index.yml",
    },
    specFirst: {
      mode: "mapped",
      ignore: [
        "(^|/)node_modules/",
        "^spec/book/",
        "^(?:reports|\\.renovate|\\.local)/",
        "^tests/",
        "\\.(?:spec|test)\\.[cm]?[jt]sx?$",
      ],
      rules: [
        {
          pattern:
            "^src/wave(?:s|-evidence|-state)\\.mjs$|^scripts/(?:wave-state|validate-wave-target)\\.mjs$",
          chapters: ["spec/src/waves.md"],
        },
        {
          pattern: "^src/policy\\.mjs$",
          chapters: ["spec/src/inventory.md", "spec/src/notifications.md"],
        },
        {
          pattern: "^src/github\\.mjs$",
          chapters: ["spec/src/inventory.md", "spec/src/policy.md"],
        },
        {
          pattern: "^scripts/inventory\\.mjs$",
          chapters: ["spec/src/inventory.md"],
        },
        { pattern: "^config/", chapters: ["spec/src/policy.md"] },
        {
          pattern:
            "^src/renovate\\.mjs$|^scripts/configure-renovate\\.mjs$|^renovate\\.config\\.cjs$",
          chapters: ["spec/src/reconciliation.md"],
        },
        {
          pattern: "^src/changesets\\.mjs$|^scripts/prepare-pr\\.mjs$",
          chapters: ["spec/src/release-intent.md"],
        },
        {
          pattern:
            "^src/(?:consumer-ci|docker-context)\\.mjs$|^scripts/(?:prepare-consumer|onboard-changesets)\\.mjs$|^templates/",
          chapters: ["spec/src/consumer-integration.md"],
        },
        {
          pattern:
            "^src/maintenance-policy\\.mjs$|^scripts/audit-maintenance\\.mjs$",
          chapters: ["spec/src/monitoring.md", "spec/src/policy.md"],
        },
        {
          pattern: "^src/profile-writer\\.mjs$|^scripts/publish-profile\\.mjs$",
          chapters: ["spec/src/profile.md"],
        },
        {
          pattern: "^scripts/notify\\.mjs$",
          chapters: ["spec/src/notifications.md"],
        },
        {
          pattern: "^\\.github/workflows/reconcile\\.yml$",
          chapters: ["spec/src/reconciliation.md", "spec/src/wiring.md"],
        },
        {
          pattern: "^\\.github/workflows/notify\\.yml$",
          chapters: ["spec/src/notifications.md", "spec/src/wiring.md"],
        },
        {
          pattern:
            "^\\.github/workflows/(?:app-readiness|maintenance-audit)\\.yml$",
          chapters: ["spec/src/monitoring.md", "spec/src/wiring.md"],
        },
        {
          pattern: "^\\.github/workflows/profile-refresh\\.yml$",
          chapters: ["spec/src/profile.md", "spec/src/wiring.md"],
        },
        {
          pattern: "^\\.github/workflows/(?:check|pages)\\.yml$",
          chapters: [
            "spec/src/governance.md",
            "spec/src/publishing.md",
            "spec/src/wiring.md",
          ],
        },
        {
          pattern:
            "^scripts/check\\.mjs$|^spec-validator\\.config\\.mjs$|^spec/book\\.toml$|^\\.qmd/|^(?:AGENTS|README)\\.md$|^\\.(?:gitignore|prettierignore)$",
          chapters: ["spec/src/governance.md"],
        },
        {
          pattern: "^(?:package\\.json|pnpm-lock\\.yaml)$",
          chapters: ["spec/src/governance.md", "spec/src/publishing.md"],
        },
      ],
      protected: [
        "^src/",
        "^scripts/",
        "^templates/",
        "^config/",
        "^\\.github/workflows/",
        "^renovate\\.config\\.cjs$",
        "^spec-validator\\.config\\.mjs$",
        "^spec/book\\.toml$",
        "^\\.qmd/",
        "^(?:package\\.json|pnpm-lock\\.yaml|AGENTS\\.md|README\\.md|\\.gitignore|\\.prettierignore)$",
      ],
    },
  },
  check: { build: true, first: true },
});
