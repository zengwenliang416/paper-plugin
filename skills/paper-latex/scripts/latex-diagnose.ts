#!/usr/bin/env npx tsx
/**
 * latex-diagnose.ts — Parse a LaTeX build log into classified, actionable diagnostics.
 *
 * Does not compile; feed it a pdflatex/latexmk log file. Deterministic parse.
 *
 * Usage:
 *   latex-diagnose.ts <logfile> [--json]
 * Exit: 1 when any error-severity diagnostic is found, else 0.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

interface Rule {
  category: string;
  severity: "error" | "warning";
  re: RegExp;
  fix: string;
}

const RULES: Rule[] = [
  { category: "undefined-command", severity: "error", re: /Undefined control sequence/, fix: "check spelling or add the package that defines the macro" },
  { category: "undefined-citation", severity: "error", re: /Citation\s+[`'][^'`]*'?\s+(?:on page [^ ]+ )?undefined/i, fix: "run biber/bibtex and check the citekey" },
  { category: "undefined-reference", severity: "error", re: /Reference\s+[`'][^'`]*'?\s+(?:on page [^ ]+ )?undefined/i, fix: "add or fix \\label and rerun LaTeX twice" },
  { category: "missing-file", severity: "error", re: /File\s+[`'][^'`]*'?\s+not found|LaTeX Error: File/i, fix: "install the missing package or fix the path" },
  { category: "math-mode", severity: "error", re: /Missing \$ inserted/, fix: "wrap math in $…$ or \\(...\\)" },
  { category: "runaway", severity: "error", re: /Runaway argument|Paragraph ended before/, fix: "find the unbalanced brace" },
  { category: "fatal", severity: "error", re: /Emergency stop|Fatal error occurred/, fix: "the build aborted — fix the first real error above this line" },
  { category: "overfull", severity: "warning", re: /Overfull \\hbox/, fix: "rephrase or adjust spacing (non-blocking)" },
  { category: "underfull", severity: "warning", re: /Underfull \\hbox/, fix: "adjust spacing or content (non-blocking)" },
];

interface Diagnostic {
  category: string;
  severity: "error" | "warning";
  count: number;
  sample: string;
  fix: string;
}

function parseLog(text: string): Diagnostic[] {
  const lines = text.split(/\r?\n/);
  const out: Diagnostic[] = [];
  for (const rule of RULES) {
    const hits = lines.filter((l) => rule.re.test(l));
    if (hits.length > 0) {
      out.push({
        category: rule.category,
        severity: rule.severity,
        count: hits.length,
        sample: hits[0].trim().slice(0, 160),
        fix: rule.fix,
      });
    }
  }
  return out;
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { json: { type: "boolean" }, help: { type: "boolean", short: "h" } },
});

if (values.help) {
  console.log("Usage: npx tsx scripts/latex-diagnose.ts <logfile> [--json]");
  process.exit(0);
}

const logArg = positionals[0];
if (!logArg) {
  console.log("Usage: npx tsx scripts/latex-diagnose.ts <logfile> [--json]");
  process.exit(2);
}
const logPath = resolve(logArg);
if (!existsSync(logPath)) {
  console.error(`Error: log file not found: ${logPath}`);
  process.exit(3);
}

const diagnostics = parseLog(readFileSync(logPath, "utf8"));
const errors = diagnostics.filter((d) => d.severity === "error").reduce((s, d) => s + d.count, 0);
const warnings = diagnostics.filter((d) => d.severity === "warning").reduce((s, d) => s + d.count, 0);

if (values.json) {
  console.log(JSON.stringify({ errors, warnings, diagnostics }, null, 2));
} else {
  console.log(`LaTeX diagnostics — ${logArg}`);
  console.log("=".repeat(48));
  console.log(`  ${errors} error(s), ${warnings} warning(s)`);
  if (diagnostics.length === 0) {
    console.log(`\nNo known error patterns found.`);
  } else {
    for (const d of diagnostics) {
      console.log(`\n[${d.severity}] ${d.category} (${d.count})`);
      console.log(`  ${d.sample}`);
      console.log(`  → ${d.fix}`);
    }
    console.log(`\nFix the first error first; later errors are often cascades. Re-run twice for refs/citations.`);
  }
}

process.exit(errors > 0 ? 1 : 0);
