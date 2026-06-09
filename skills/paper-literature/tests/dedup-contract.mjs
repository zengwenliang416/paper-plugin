import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "..", "scripts", "dedup.ts");
const casesPath = join(here, "dedup-cases.json");

let failed = false;
function fail(message) {
  console.error(`FAIL: ${message}`);
  failed = true;
}

if (!existsSync(script)) fail("missing dedup.ts");

const cases = JSON.parse(readFileSync(casesPath, "utf8"));

// --classify reads only name/records; extra fields (expect*) are ignored.
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
    const got = results[index]?.keptCount;
    if (got !== testCase.expectKeptCount) {
      fail(`${testCase.name}: expected keptCount ${testCase.expectKeptCount}, got ${got}`);
    }
    if (testCase.expectKeptIds) {
      const ids = (results[index]?.keptIds ?? []).slice().sort();
      const want = testCase.expectKeptIds.slice().sort();
      if (JSON.stringify(ids) !== JSON.stringify(want)) {
        fail(`${testCase.name}: expected keptIds ${JSON.stringify(want)}, got ${JSON.stringify(ids)}`);
      }
    }
  });
}

if (failed) {
  process.exit(1);
}

console.log(`Dedup classify contract passed (${cases.length} cases).`);
