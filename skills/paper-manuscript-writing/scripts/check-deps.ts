#!/usr/bin/env npx tsx
/**
 * check-deps.ts — Dependency detection for manuscript support scripts.
 * Checks pandoc, libreoffice, node_modules, pandoc-crossref availability.
 * Exports checkDeps() for use by other scripts.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = join(__dirname, "..");

interface DepResult {
  name: string;
  available: boolean;
  version?: string;
  message?: string;
}

function checkCommand(cmd: string, versionFlag = "--version"): DepResult {
  try {
    const out = execSync(`${cmd} ${versionFlag}`, {
      encoding: "utf-8",
      timeout: 10_000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    const version = out.split("\n")[0];
    return { name: cmd, available: true, version };
  } catch {
    return { name: cmd, available: false };
  }
}

export function checkDeps(
  required: string[] = ["pandoc"]
): { ok: boolean; results: DepResult[] } {
  const results: DepResult[] = [];

  // pandoc
  const pandoc = checkCommand("pandoc");
  if (!pandoc.available) {
    pandoc.message =
      "pandoc is required. Install: brew install pandoc (macOS) / apt install pandoc (Linux) / choco install pandoc (Windows)";
  }
  results.push(pandoc);

  // libreoffice (for .doc conversion)
  const lo = checkCommand("soffice");
  if (!lo.available) {
    lo.message =
      "LibreOffice is needed for .doc → .docx conversion. Install: brew install --cask libreoffice";
  }
  results.push(lo);

  // pandoc-crossref (optional)
  const crossref = checkCommand("pandoc-crossref");
  if (!crossref.available) {
    crossref.message =
      "pandoc-crossref is optional (for figure/table cross-references). Install: brew install pandoc-crossref";
  }
  results.push(crossref);

  // node_modules
  const nmExists = existsSync(join(SKILL_ROOT, "node_modules"));
  results.push({
    name: "node_modules",
    available: nmExists,
    message: nmExists
      ? undefined
      : `Run: cd ${SKILL_ROOT} && npm install`,
  });

  // Check required deps
  const missing = required.filter((name) => {
    const r = results.find((d) => d.name === name);
    return r && !r.available;
  });
  const ok = missing.length === 0;

  return { ok, results };
}

export function ensureDeps(required: string[] = ["pandoc"]): void {
  const { ok, results } = checkDeps(required);
  if (!ok) {
    console.error("Missing required dependencies:\n");
    for (const r of results) {
      if (required.includes(r.name) && !r.available) {
        console.error(`  ✗ ${r.name}: ${r.message}`);
      }
    }
    console.error("");
    process.exit(1);
  }
}

// CLI: run directly to see all dependency status
if (process.argv[1] && process.argv[1].includes("check-deps")) {
  const { ok, results } = checkDeps([]);
  console.log("Paper Manuscript Writing Support Tools — Dependency Check\n");
  for (const r of results) {
    const icon = r.available ? "✓" : "✗";
    const info = r.available ? r.version ?? "" : r.message ?? "not found";
    console.log(`  ${icon} ${r.name}: ${info}`);
  }
  console.log(`\nOverall: ${ok ? "All good" : "Some dependencies missing"}`);
  process.exit(ok ? 0 : 1);
}
