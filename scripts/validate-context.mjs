import {
  cpSync,
  existsSync,
  mkdtempSync,
  rmSync,
  statSync,
  utimesSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const contextScript = join(root, "skills", "paper-manuscript-writing", "scripts", "context.ts");
const fixturesDir = join(root, "skills", "paper-manuscript-writing", "tests", "context-fixtures");

let failed = false;

function fail(message) {
  console.error(`ERROR: ${message}`);
  failed = true;
}

function runContext(args, { cwd = root, expectFailure = false } = {}) {
  try {
    const stdout = execFileSync("npx", ["tsx", contextScript, ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    });
    if (expectFailure) {
      fail(`expected context command to fail: ${args.join(" ")}`);
    }
    return { stdout, failed: false };
  } catch (error) {
    const stdout = error.stdout?.toString() || "";
    if (!expectFailure) {
      fail(`context command failed: ${args.join(" ")}\n${stdout}${error.stderr?.toString() || error.message}`);
    }
    return { stdout, failed: true };
  }
}

function parseJson(stdout, label) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    fail(`${label} did not return valid JSON: ${error.message}`);
    return null;
  }
}

function copyFixture(name) {
  const source = join(fixturesDir, name);
  if (!existsSync(source)) {
    fail(`missing context fixture: ${name}`);
    return null;
  }
  const dir = mkdtempSync(join(tmpdir(), `paper-context-${name}-`));
  cpSync(source, dir, { recursive: true });
  return dir;
}

function makeOutputNewer(projectDir) {
  const now = new Date();
  const output = join(projectDir, "output", "thesis.docx");
  if (existsSync(output)) utimesSync(output, now, now);
}

function makeOutputOlder(projectDir) {
  const old = new Date("2000-01-01T00:00:00Z");
  const now = new Date();
  const output = join(projectDir, "output", "thesis.docx");
  const content = join(projectDir, "content", "ch01.md");
  if (existsSync(output)) utimesSync(output, old, old);
  if (existsSync(content)) utimesSync(content, now, now);
}

function assertFinding(result, code, label) {
  if (!result?.findings?.some((finding) => finding.code === code)) {
    fail(`${label} expected finding code ${code}`);
  }
}

if (!existsSync(contextScript) || !statSync(contextScript).isFile()) {
  fail("missing skills/paper-manuscript-writing/scripts/context.ts");
}

runContext(["--help"]);

const smoke = copyFixture("valid-project");
if (smoke) {
  try {
    makeOutputNewer(smoke);
    runContext(["init", smoke]);
    const load = runContext(["load", smoke, "--format", "json"]);
    const loaded = parseJson(load.stdout, "context load");
    if (!loaded?.manifest?.project_id) fail("context load must include manifest.project_id");
    runContext(["snapshot", smoke, "--label", "smoke"]);
    const validate = runContext(["validate", smoke, "--gate", "pre-export"]);
    const result = parseJson(validate.stdout, "valid fixture validate");
    if (result?.status !== "passed") {
      fail(`valid fixture should pass pre-export, got ${result?.status}`);
    }
  } finally {
    rmSync(smoke, { recursive: true, force: true });
  }
}

const cases = [
  {
    fixture: "missing-chapter",
    gate: "pre-write",
    code: "CHAPTER_FILE_MISSING",
  },
  {
    fixture: "stale-output",
    gate: "pre-archive",
    code: "OUTPUT_STALE",
    beforeValidate: makeOutputOlder,
  },
  {
    fixture: "missing-claim-evidence",
    gate: "pre-export",
    code: "CLAIM_EVIDENCE_MISSING",
  },
  {
    fixture: "dangling-citation",
    gate: "pre-export",
    code: "CITATION_DANGLING",
  },
  {
    fixture: "ai-image-evidence",
    gate: "pre-export",
    code: "VISUAL_AI_EVIDENCE",
  },
  {
    fixture: "data-source-missing",
    gate: "pre-export",
    code: "DATA_SOURCE_MISSING",
  },
  {
    fixture: "docx-unverified",
    gate: "pre-archive",
    code: "DOCX_RENDER_NOT_VERIFIED",
  },
  {
    fixture: "privacy-leak",
    gate: "pre-archive",
    code: "PRIVACY_ENV_FILE",
  },
];

for (const testCase of cases) {
  const project = copyFixture(testCase.fixture);
  if (!project) continue;
  try {
    makeOutputNewer(project);
    runContext(["init", project]);
    testCase.beforeValidate?.(project);
    const validate = runContext(
      ["validate", project, "--gate", testCase.gate],
      { expectFailure: true }
    );
    const result = parseJson(validate.stdout, `${testCase.fixture} validate`);
    if (result?.status !== "blocked") {
      fail(`${testCase.fixture} should be blocked, got ${result?.status}`);
    }
    assertFinding(result, testCase.code, testCase.fixture);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
}

if (failed) {
  process.exit(1);
}

console.log("Context contracts are valid.");
