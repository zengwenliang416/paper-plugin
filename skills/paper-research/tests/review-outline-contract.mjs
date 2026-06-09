import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "..", "scripts", "review-outline.ts");
const fixture = join(here, "review-outline-fixture.bib");

let failed = false;
function fail(message) {
  console.error(`FAIL: ${message}`);
  failed = true;
}

if (!existsSync(script)) fail("missing review-outline.ts");

let parsed;
try {
  const stdout = execFileSync("npx", ["tsx", script, fixture, "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
  });
  parsed = JSON.parse(stdout);
} catch (error) {
  fail(`review-outline failed: ${error.stderr?.toString() || error.message}`);
}

if (parsed) {
  // Deterministic clustering: 3 "attention" papers, 2 "image" papers.
  if (parsed.total !== 5) fail(`expected 5 papers, got ${parsed.total}`);
  const att = parsed.clusters?.attention ?? [];
  const img = parsed.clusters?.image ?? [];
  if (att.length !== 3) fail(`expected attention cluster of 3, got ${att.length}`);
  if (img.length !== 2) fail(`expected image cluster of 2, got ${img.length}`);
  // Timeline ascending by year.
  const years = (parsed.timeline ?? []).map((p) => p.year);
  const sorted = [...years].sort();
  if (JSON.stringify(years) !== JSON.stringify(sorted)) fail(`timeline not sorted by year: ${years}`);
}

if (failed) {
  process.exit(1);
}

console.log("Review outline contract passed (5-paper fixture, deterministic clusters).");
