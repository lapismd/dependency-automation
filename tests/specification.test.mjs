import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import YAML from "yaml";
import config from "../spec-validator.config.mjs";

test("canonical map fails closed for new protected code and covers existing owners", async () => {
  const policy = config.validators.specFirst;
  const paths = ["package.json", "spec-validator.config.mjs"];
  for (const root of [
    "src",
    "scripts",
    "config",
    "templates",
    ".github/workflows",
  ]) {
    for (const name of await readdir(new URL(`../${root}`, import.meta.url), {
      recursive: true,
    })) {
      const path = `${root}/${name}`;
      if (
        /\.(?:mjs|cjs|json|ya?ml)$/.test(path) &&
        !policy.ignore.some((pattern) => new RegExp(pattern).test(path))
      )
        paths.push(path);
    }
  }
  for (const path of paths) {
    assert(
      policy.protected.some((pattern) => new RegExp(pattern).test(path)),
      path,
    );
    assert(
      policy.rules.some((rule) => new RegExp(rule.pattern).test(path)),
      path,
    );
  }
  const unknown = "src/unmapped-coordinator.mjs";
  assert(policy.protected.some((pattern) => new RegExp(pattern).test(unknown)));
  assert(!policy.rules.some((rule) => new RegExp(rule.pattern).test(unknown)));
  const profile = policy.rules.find((rule) =>
    new RegExp(rule.pattern).test("src/profile-writer.mjs"),
  );
  assert.deepEqual(profile.chapters, ["spec/src/profile.md"]);
});

test("Pages publishes only a verified main book with isolated deployment authority", async () => {
  const workflow = YAML.parse(
    await readFile(
      new URL("../.github/workflows/pages.yml", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(workflow.on.pull_request, undefined);
  assert.deepEqual(workflow.on.push.branches, ["main"]);
  const { book, deploy } = workflow.jobs;
  assert.match(book.if, /refs\/heads\/main/);
  assert.match(deploy.if, /refs\/heads\/main/);
  assert.deepEqual(book.permissions, { contents: "read", pages: "read" });
  assert.deepEqual(deploy.permissions, { pages: "write", "id-token": "write" });
  assert.equal(deploy.needs, "book");
  assert.equal(deploy.environment.name, "github-pages");
  const verify = book.steps.findIndex((step) => step.run === "pnpm verify");
  const artifact = book.steps.findIndex((step) =>
    step.uses?.startsWith("actions/upload-pages-artifact@"),
  );
  assert(verify >= 0 && artifact > verify);
  assert.equal(book.steps[artifact].with.path, "spec/book");
  assert(!JSON.stringify(workflow).includes("secrets."));
  assert(!JSON.stringify(workflow).includes("create-github-app-token"));
  for (const step of [...book.steps, ...deploy.steps])
    if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
});
