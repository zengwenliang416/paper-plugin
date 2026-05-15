#!/usr/bin/env npx tsx
/**
 * version.ts — Version management for thesis projects.
 *
 * Subcommands:
 *   tag <name> [--notes "..."]   Create version tag
 *   list                         List all versions
 *   export <name>                Re-export a specific version
 *
 * Usage:
 *   npx tsx scripts/version.ts <project-dir> tag "draft-1" --notes "初稿完成"
 *   npx tsx scripts/version.ts <project-dir> list
 *   npx tsx scripts/version.ts <project-dir> export "draft-1"
 */
import { execSync } from "node:child_process";
import {
  copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync,
  statSync, writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VersionEntry {
  tag: string;
  date: string;
  commit: string;
  notes: string;
  output: string;
}

interface ThesisState {
  versions: VersionEntry[];
  currentStage: number;
  stageHistory: unknown[];
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    notes: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

function printHelp(): void {
  console.log(`Usage: npx tsx scripts/version.ts <project-dir> <command> [args] [options]

Commands:
  tag <name> [--notes "..."]   Create a version tag
                               - Updates .thesis.json
                               - Copies latest output/*.docx to output/thesis-<name>.docx
                               - Creates git tag thesis/<name> if in a git repo

  list                         List all versions from .thesis.json
                               Shows date, commit, notes for each version

  export <name>                Re-export a specific version
                               - If git tag exists: checkout, run export, checkout back
                               - Otherwise: report version info only

Options:
  --notes "..."                Notes for the version tag
  -h, --help                   Show this help

Examples:
  npx tsx scripts/version.ts ./my-thesis tag "draft-1" --notes "初稿完成"
  npx tsx scripts/version.ts ./my-thesis list
  npx tsx scripts/version.ts ./my-thesis export "draft-1"`);
}

if (values.help) {
  printHelp();
  process.exit(0);
}

if (positionals.length < 2) {
  printHelp();
  process.exit(1);
}

const projectDir = resolve(positionals[0]);
const command = positionals[1];

if (!existsSync(projectDir)) {
  console.error(`Error: project directory not found: ${projectDir}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const stateFile = join(projectDir, ".thesis.json");

function readState(): ThesisState {
  if (existsSync(stateFile)) {
    return JSON.parse(readFileSync(stateFile, "utf-8"));
  }
  return { versions: [], currentStage: 0, stageHistory: [] };
}

function writeState(state: ThesisState): void {
  writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

function isGitRepo(): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", {
      cwd: projectDir,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

function gitShortHead(): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: projectDir,
      stdio: "pipe",
      encoding: "utf-8",
    }).trim();
  } catch {
    return "";
  }
}

function gitTagExists(tag: string): boolean {
  try {
    execSync(`git rev-parse "refs/tags/${tag}"`, {
      cwd: projectDir,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

function gitCurrentBranch(): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: projectDir,
      stdio: "pipe",
      encoding: "utf-8",
    }).trim();
  } catch {
    return "";
  }
}

/**
 * Find the latest .docx file in output/ directory.
 */
function findLatestDocx(): string | null {
  const outDir = join(projectDir, "output");
  if (!existsSync(outDir)) return null;

  const files = readdirSync(outDir)
    .filter((f) => f.endsWith(".docx"))
    .map((f) => {
      const p = join(outDir, f);
      return { name: f, path: p, mtime: statSync(p).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  return files.length > 0 ? files[0].path : null;
}

// ---------------------------------------------------------------------------
// Command: tag
// ---------------------------------------------------------------------------

function cmdTag(): void {
  const tagName = positionals[2];
  if (!tagName) {
    console.error("Error: tag name is required.");
    console.error("Usage: npx tsx scripts/version.ts <project-dir> tag <name> [--notes \"...\"]");
    process.exit(1);
  }

  const state = readState();

  // Check for duplicate tag
  if (state.versions.some((v) => v.tag === tagName)) {
    console.error(`Error: version tag "${tagName}" already exists.`);
    console.error("Use a different name or remove the existing entry from .thesis.json.");
    process.exit(1);
  }

  // Find latest docx to copy
  const latestDocx = findLatestDocx();
  const outDir = join(projectDir, "output");
  mkdirSync(outDir, { recursive: true });

  const versionedFilename = `thesis-${tagName}.docx`;
  const versionedPath = join(outDir, versionedFilename);
  const relativeOutput = relative(projectDir, versionedPath);

  if (latestDocx) {
    copyFileSync(latestDocx, versionedPath);
    console.log(`Copied: ${relative(projectDir, latestDocx)} → ${relativeOutput}`);
  } else {
    console.warn("Warning: no .docx found in output/. Version entry created without file copy.");
    console.warn("Run export.ts first to generate a .docx file.");
  }

  // Get git commit
  const commit = gitShortHead();

  // Create version entry
  const entry: VersionEntry = {
    tag: tagName,
    date: new Date().toISOString(),
    commit,
    notes: values.notes ?? "",
    output: relativeOutput,
  };

  state.versions.push(entry);
  writeState(state);
  console.log(`Updated: .thesis.json`);

  // Create git tag if in a repo
  if (isGitRepo()) {
    const gitTag = `thesis/${tagName}`;
    if (gitTagExists(gitTag)) {
      console.warn(`Warning: git tag "${gitTag}" already exists, skipping.`);
    } else {
      try {
        const message = values.notes
          ? `thesis version: ${tagName} — ${values.notes}`
          : `thesis version: ${tagName}`;
        execSync(`git tag -a "${gitTag}" -m "${message.replace(/"/g, '\\"')}"`, {
          cwd: projectDir,
          stdio: "pipe",
        });
        console.log(`Git tag: ${gitTag}`);
      } catch (err: any) {
        console.warn(`Warning: failed to create git tag: ${err.message}`);
      }
    }
  }

  console.log(`\nVersion "${tagName}" created.`);
}

// ---------------------------------------------------------------------------
// Command: list
// ---------------------------------------------------------------------------

function cmdList(): void {
  const state = readState();

  if (state.versions.length === 0) {
    console.log("No versions found in .thesis.json");
    return;
  }

  console.log(`Versions (${state.versions.length}):\n`);

  const maxTagLen = Math.max(...state.versions.map((v) => v.tag.length), 4);

  for (const v of state.versions) {
    const date = v.date ? new Date(v.date).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "?";
    const commit = v.commit || "-";
    const notes = v.notes || "";
    const tag = v.tag.padEnd(maxTagLen);
    console.log(`  ${tag}  ${date}  [${commit}]  ${notes}`);
    if (v.output) {
      console.log(`  ${"".padEnd(maxTagLen)}  → ${v.output}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Command: export
// ---------------------------------------------------------------------------

function cmdExport(): void {
  const tagName = positionals[2];
  if (!tagName) {
    console.error("Error: version name is required.");
    console.error("Usage: npx tsx scripts/version.ts <project-dir> export <name>");
    process.exit(1);
  }

  const state = readState();
  const entry = state.versions.find((v) => v.tag === tagName);

  if (!entry) {
    console.error(`Error: version "${tagName}" not found in .thesis.json`);
    console.error("Available versions:");
    for (const v of state.versions) {
      console.error(`  - ${v.tag}`);
    }
    process.exit(1);
  }

  console.log(`Version: ${entry.tag}`);
  console.log(`  Date:   ${entry.date}`);
  console.log(`  Commit: ${entry.commit || "-"}`);
  console.log(`  Notes:  ${entry.notes || "-"}`);
  console.log(`  Output: ${entry.output || "-"}`);

  // Check if the output file already exists
  if (entry.output) {
    const outputPath = resolve(projectDir, entry.output);
    if (existsSync(outputPath)) {
      console.log(`\nOutput file exists: ${outputPath}`);
      return;
    }
  }

  // Try to re-export via git tag
  const gitTag = `thesis/${tagName}`;

  if (!isGitRepo()) {
    console.log("\nNot a git repo. Cannot re-export from tag.");
    return;
  }

  if (!gitTagExists(gitTag)) {
    console.log(`\nGit tag "${gitTag}" not found. Cannot re-export.`);
    console.log("Version info displayed above.");
    return;
  }

  // Checkout git tag, run export, checkout back
  const currentBranch = gitCurrentBranch();
  if (!currentBranch) {
    console.error("Error: could not determine current branch.");
    process.exit(1);
  }

  // Check for uncommitted changes
  try {
    const status = execSync("git status --porcelain", {
      cwd: projectDir,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();

    if (status) {
      console.error("\nError: uncommitted changes detected. Commit or stash before re-exporting.");
      process.exit(1);
    }
  } catch {
    // ignore
  }

  console.log(`\nChecking out tag: ${gitTag}`);

  try {
    execSync(`git checkout "${gitTag}"`, {
      cwd: projectDir,
      stdio: "pipe",
    });

    // Run export
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const exportScript = join(__dirname, "export.ts");

    if (!existsSync(exportScript)) {
      console.error("Error: export.ts not found.");
      execSync(`git checkout "${currentBranch}"`, { cwd: projectDir, stdio: "pipe" });
      process.exit(1);
    }

    const outDir = join(projectDir, "output");
    mkdirSync(outDir, { recursive: true });
    const outputPath = join(outDir, `thesis-${tagName}.docx`);

    console.log("Running export...");
    execSync(
      `npx tsx "${exportScript}" "${projectDir}" -o "${outputPath}"`,
      {
        cwd: projectDir,
        stdio: "inherit",
        timeout: 300_000,
      }
    );

    console.log(`\nExported: ${outputPath}`);
  } catch (err: any) {
    console.error(`Export failed: ${err.message}`);
  } finally {
    // Always checkout back
    console.log(`Returning to: ${currentBranch}`);
    try {
      execSync(`git checkout "${currentBranch}"`, {
        cwd: projectDir,
        stdio: "pipe",
      });
    } catch {
      console.error("Warning: failed to checkout back. You may be in detached HEAD state.");
      console.error(`Run: git checkout ${currentBranch}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

switch (command) {
  case "tag":
    cmdTag();
    break;
  case "list":
    cmdList();
    break;
  case "export":
    cmdExport();
    break;
  default:
    console.error(`Error: unknown command "${command}"`);
    console.error("Available commands: tag, list, export");
    printHelp();
    process.exit(1);
}
