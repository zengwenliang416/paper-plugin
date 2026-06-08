import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const skillDir = join(here, "..");
const initScript = join(skillDir, "scripts", "init-review-panel.ts");
const validateScript = join(skillDir, "scripts", "validate-review-panel.ts");
const casesPath = join(here, "review-panel-cases.json");

let failed = false;
function fail(message) {
  console.error(`FAIL: ${message}`);
  failed = true;
}

function run(script, args, { expectFailure = false } = {}) {
  try {
    const stdout = execFileSync("npx", ["tsx", script, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    });
    if (expectFailure) fail(`expected command to fail: ${args.join(" ")}`);
    return { stdout };
  } catch (error) {
    const stdout = error.stdout?.toString() || "";
    if (!expectFailure) {
      fail(`command failed: ${args.join(" ")}\n${stdout}${error.stderr?.toString() || error.message}`);
    }
    return { stdout };
  }
}

function parseJson(stdout, label) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    fail(`${label} did not return valid JSON: ${error.message}\n${stdout}`);
    return null;
  }
}

function newProject() {
  return mkdtempSync(join(tmpdir(), "review-panel-"));
}

function writeConfig(dir, yaml) {
  const path = join(dir, ".paper-context", "review-panel.yaml");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, yaml, "utf8");
}

if (!existsSync(initScript) || !existsSync(validateScript)) {
  fail("missing init-review-panel.ts or validate-review-panel.ts");
}

// Smoke 1: init --default then validate passes.
{
  const dir = newProject();
  try {
    run(initScript, [dir, "--default"]);
    const result = parseJson(run(validateScript, [dir]).stdout, "default validate");
    if (result?.status !== "passed") fail(`default panel should pass, got ${result?.status}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Smoke 2: init --disable then validate passes.
{
  const dir = newProject();
  try {
    run(initScript, [dir, "--disable"]);
    const result = parseJson(run(validateScript, [dir]).stdout, "disabled validate");
    if (result?.status !== "passed") fail(`disabled panel should pass, got ${result?.status}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Smoke 3: no config file → skipped.
{
  const dir = newProject();
  try {
    const result = parseJson(run(validateScript, [dir]).stdout, "skipped validate");
    if (result?.status !== "skipped") fail(`missing config should skip, got ${result?.status}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Failure cases from JSON.
const cases = JSON.parse(readFileSync(casesPath, "utf8"));
for (const testCase of cases) {
  const dir = newProject();
  try {
    writeConfig(dir, testCase.yaml);
    const expectFailure = testCase.expectStatus === "blocked";
    const result = parseJson(
      run(validateScript, [dir], { expectFailure }).stdout,
      `${testCase.name} validate`
    );
    if (result?.status !== testCase.expectStatus) {
      fail(`${testCase.name}: expected status ${testCase.expectStatus}, got ${result?.status}`);
    }
    if (testCase.expectCode && !result?.findings?.some((f) => f.code === testCase.expectCode)) {
      fail(`${testCase.name}: expected finding code ${testCase.expectCode}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Review panel contract passed (${cases.length} cases + 3 smoke).`);
