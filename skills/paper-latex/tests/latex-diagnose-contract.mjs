import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "..", "scripts", "latex-diagnose.ts");
const fixture = join(here, "sample-build.log");

let failed = false;
function fail(message) {
  console.error(`FAIL: ${message}`);
  failed = true;
}

if (!existsSync(script)) fail("missing latex-diagnose.ts");

let parsed;
let stdout = "";
try {
  // diagnose exits 1 when errors are present (the fixture has errors).
  stdout = execFileSync("npx", ["tsx", script, fixture, "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
  });
} catch (error) {
  stdout = error.stdout?.toString() || "";
}
try {
  parsed = JSON.parse(stdout);
} catch (error) {
  fail(`diagnose did not return valid JSON: ${error.message}\n${stdout}`);
}

if (parsed) {
  const cats = new Set((parsed.diagnostics ?? []).map((d) => d.category));
  for (const c of ["undefined-command", "undefined-citation", "undefined-reference", "math-mode", "overfull"]) {
    if (!cats.has(c)) fail(`expected category ${c}`);
  }
  if ((parsed.errors ?? 0) < 4) fail(`expected >= 4 errors, got ${parsed.errors}`);
}

if (failed) {
  process.exit(1);
}

console.log("LaTeX diagnose contract passed (5 categories from fixture log).");
