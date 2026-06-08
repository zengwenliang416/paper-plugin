import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const verifyScript = join(here, "..", "scripts", "verify-refs.ts");
const casesPath = join(here, "verify-classify-cases.json");

let failed = false;
function fail(message) {
  console.error(`FAIL: ${message}`);
  failed = true;
}

if (!existsSync(verifyScript)) fail("missing verify-refs.ts");

const cases = JSON.parse(readFileSync(casesPath, "utf8"));

// --classify reads only entry/evidence; extra fields (name/expectStatus) are ignored.
let stdout = "";
try {
  stdout = execFileSync("npx", ["tsx", verifyScript, "--classify", casesPath], {
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
    const got = results[index]?.status;
    if (got !== testCase.expectStatus) {
      fail(`${testCase.name}: expected ${testCase.expectStatus}, got ${got}`);
    }
  });
}

if (failed) {
  process.exit(1);
}

console.log(`Citation verify classify contract passed (${cases.length} cases).`);
