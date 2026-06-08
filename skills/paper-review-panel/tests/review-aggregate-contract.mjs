import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const reviewScript = join(here, "..", "scripts", "review.ts");
const casesPath = join(here, "aggregate-cases.json");

let failed = false;
function fail(message) {
  console.error(`FAIL: ${message}`);
  failed = true;
}

// review.ts exits 1 only when result === "block".
function runAggregate(verdictsPath, { expectFailure }) {
  try {
    const stdout = execFileSync("npx", ["tsx", reviewScript, ".", "--aggregate", verdictsPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    });
    if (expectFailure) fail(`expected non-zero exit for ${verdictsPath}`);
    return stdout;
  } catch (error) {
    const stdout = error.stdout?.toString() || "";
    if (!expectFailure) fail(`aggregate failed: ${error.stderr?.toString() || error.message}`);
    return stdout;
  }
}

if (!existsSync(reviewScript)) fail("missing review.ts");

const cases = JSON.parse(readFileSync(casesPath, "utf8"));
for (const testCase of cases) {
  const dir = mkdtempSync(join(tmpdir(), "review-agg-"));
  const verdictsPath = join(dir, "verdicts.json");
  try {
    writeFileSync(verdictsPath, JSON.stringify(testCase.verdicts), "utf8");
    const expectFailure = testCase.expectResult === "block";
    const stdout = runAggregate(verdictsPath, { expectFailure });
    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      fail(`${testCase.name}: did not return valid JSON: ${stdout}`);
      continue;
    }
    if (parsed?.result !== testCase.expectResult) {
      fail(`${testCase.name}: expected result ${testCase.expectResult}, got ${parsed?.result}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Review aggregate contract passed (${cases.length} cases).`);
