import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "..", "scripts", "response-gate.ts");
const casesPath = join(here, "response-gate-cases.json");

let failed = false;
function fail(message) {
  console.error(`FAIL: ${message}`);
  failed = true;
}

if (!existsSync(script)) fail("missing response-gate.ts");

const cases = JSON.parse(readFileSync(casesPath, "utf8"));

// --classify reads only name/comments; extra fields (expectReadiness/expectIssue) are ignored.
let stdout = "";
try {
  stdout = execFileSync("npx", ["tsx", script, "--classify", casesPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
  });
} catch (error) {
  fail(`classify run failed: ${error.stderr?.toString() || error.message}`);
}

let results;
try {
  results = JSON.parse(stdout);
} catch (error) {
  fail(`classify did not return valid JSON: ${error.message}\n${stdout}`);
}

if (Array.isArray(results)) {
  cases.forEach((testCase, index) => {
    const got = results[index]?.readiness;
    if (got !== testCase.expectReadiness) {
      fail(`${testCase.name}: expected package ${testCase.expectReadiness}, got ${got}`);
    }
    if (testCase.expectIssue) {
      const issues = (results[index]?.comments ?? []).flatMap((c) => c.issues);
      if (!issues.includes(testCase.expectIssue)) {
        fail(`${testCase.name}: expected issue ${testCase.expectIssue}, got [${issues.join(", ")}]`);
      }
    }
  });
}

if (failed) {
  process.exit(1);
}

console.log(`Response gate classify contract passed (${cases.length} cases).`);
