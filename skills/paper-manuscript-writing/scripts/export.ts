#!/usr/bin/env npx tsx
/**
 * export.ts — Markdown → DOCX thesis exporter.
 *
 * Merges content/*.md files, rewrites image paths, and calls pandoc with:
 *   --reference-doc   (Word style template)
 *   --lua-filter       (thesis formatting: cover, sections, page numbers, etc.)
 *   --citeproc + --csl (bibliography formatting)
 *   --metadata-file    (thesis.yaml metadata)
 */
import { execFileSync, execSync } from "node:child_process";
import {
  copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync,
} from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import YAML from "yaml";
import { ensureDeps } from "./check-deps.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = join(__dirname, "..");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    output: { type: "string", short: "o" },
    version: { type: "string", short: "v" },
    "reference-doc": { type: "string" },
    "lua-filter": { type: "string" },
    csl: { type: "string" },
    "no-citeproc": { type: "boolean" },
    "no-toc": { type: "boolean" },
    "no-postprocess": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`Usage: npx tsx scripts/export.ts <project-dir> [options]

Options:
  -o, --output         Output .docx path (default: output/thesis.docx)
  -v, --version        Create version tag after export via scripts/version.ts
  --reference-doc      Custom reference.docx path
  --lua-filter         Custom Lua filter path
  --csl                Custom CSL citation style path
  --no-citeproc        Skip bibliography processing
  --no-toc             Skip table of contents
  --no-postprocess     Skip generic Chinese thesis DOCX post-processing
  -h, --help           Show help`);
  process.exit(0);
}

ensureDeps(["pandoc"]);

const projectDir = resolve(positionals[0]);

if (!existsSync(projectDir)) {
  console.error(`Error: project directory not found: ${projectDir}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Step 1: Read thesis.yaml
// ---------------------------------------------------------------------------

const yamlPath = join(projectDir, "thesis.yaml");
if (!existsSync(yamlPath)) {
  console.error(`Error: thesis.yaml not found in ${projectDir}`);
  console.error("Run import.ts first to create the project structure.");
  process.exit(1);
}

const config = YAML.parse(readFileSync(yamlPath, "utf-8"));
console.log(`Thesis: ${config.title || "(untitled)"}`);

// ---------------------------------------------------------------------------
// Step 2: Determine chapter order + merge content
// ---------------------------------------------------------------------------

const contentDir = join(projectDir, "content");
if (!existsSync(contentDir)) {
  console.error(`Error: content/ directory not found in ${projectDir}`);
  process.exit(1);
}

let chapterFiles: string[] = config.chapters;
if (!chapterFiles || chapterFiles.length === 0) {
  // Auto-detect: list .md files in content/, sorted
  const fs = await import("node:fs/promises");
  const entries = (await fs.readdir(contentDir)).filter((f) => f.endsWith(".md")).sort();
  chapterFiles = entries;
}

console.log(`Merging ${chapterFiles.length} files...`);

const parts: string[] = [];
for (const filename of chapterFiles) {
  const filePath = join(contentDir, filename);
  if (!existsSync(filePath)) {
    console.warn(`  Warning: ${filename} not found, skipping`);
    continue;
  }
  let content = readFileSync(filePath, "utf-8");

  // Rewrite relative image paths: ../assets/ → assets/ (relative to project root)
  content = content.replace(
    /!\[([^\]]*)\]\(\.\.\/(assets\/[^)]+)\)/g,
    "![$1]($2)"
  );

  parts.push(content);
  console.log(`  + ${filename}`);
}

const combinedMd = parts.join("\n\n");
const hasTocMarker = /<!--\s*toc\s*-->/.test(combinedMd);

// ---------------------------------------------------------------------------
// Step 3: Write temporary files
// ---------------------------------------------------------------------------

const tmpDir = join(projectDir, ".tmp-export");
mkdirSync(tmpDir, { recursive: true });

const combinedPath = join(tmpDir, "combined.md");
writeFileSync(combinedPath, combinedMd, "utf-8");

// Write metadata file for pandoc (Lua filter reads these)
const metaYaml: Record<string, unknown> = {
  thesisTitle: config.title || "",
  thesisAuthor: config.author || "",
  thesisSchool: config.school || "",
  thesisDepartment: config.department || "",
  thesisMajor: config.major || "",
  thesisAdvisor: config.advisor || "",
  thesisAdvisorTitle: config.advisorTitle || "",
  thesisStudentId: config.studentId || "",
  thesisDate: config.date || "",
  thesisSubtitle: config.subtitle || "硕士学位论文",
};

// Add crossref config if present
if (config.crossref) {
  Object.assign(metaYaml, config.crossref);
}

const metaPath = join(tmpDir, "meta.yaml");
writeFileSync(metaPath, YAML.stringify(metaYaml), "utf-8");

// ---------------------------------------------------------------------------
// Step 4: Resolve format files (project overrides > skill defaults)
// ---------------------------------------------------------------------------

function resolveFile(
  cliOverride: string | undefined,
  projectPath: string,
  skillDefault: string
): string | null {
  if (cliOverride && existsSync(cliOverride)) return resolve(cliOverride);
  if (existsSync(projectPath)) return projectPath;
  if (existsSync(skillDefault)) return skillDefault;
  return null;
}

const referenceDoc = resolveFile(
  values["reference-doc"],
  join(projectDir, "format", "reference.docx"),
  join(SKILL_ROOT, "assets", "reference.docx")
);

const luaFilter = resolveFile(
  values["lua-filter"],
  join(projectDir, "format", "filter.lua"),
  join(SKILL_ROOT, "filters", "thesis.lua")
);

const cslFile = resolveFile(
  values.csl,
  join(projectDir, "format", "citation.csl"),
  join(SKILL_ROOT, "assets", "gbt7714-numeric.csl")
);

const bibFile = join(projectDir, "assets", "refs.bib");
const hasBib = existsSync(bibFile) &&
  readFileSync(bibFile, "utf-8").trim().split("\n").length > 2;

// ---------------------------------------------------------------------------
// Step 5: Build pandoc command
// ---------------------------------------------------------------------------

const outDir = join(projectDir, "output");
mkdirSync(outDir, { recursive: true });

const outputPath = values.output
  ? resolve(values.output)
  : join(outDir, "thesis.docx");

const cmd: string[] = [
  "pandoc",
  `"${combinedPath}"`,
  "-f", "markdown+tex_math_dollars",
  "-t", "docx",
  `--metadata-file="${metaPath}"`,
  `--resource-path="${projectDir}"`,
  "-o", `"${outputPath}"`,
];

if (referenceDoc) {
  cmd.push(`--reference-doc="${referenceDoc}"`);
  console.log(`  Reference doc: ${relative(projectDir, referenceDoc) || referenceDoc}`);
}

if (luaFilter) {
  cmd.push(`--lua-filter="${luaFilter}"`);
  console.log(`  Lua filter: ${relative(projectDir, luaFilter) || luaFilter}`);
}

// pandoc-crossref (optional, must come before --citeproc)
try {
  execSync("pandoc-crossref --version", { stdio: "pipe" });
  cmd.push("--filter", "pandoc-crossref");
  console.log(`  Cross-references: pandoc-crossref`);
} catch {
  // not installed, skip
}

// Bibliography
if (!values["no-citeproc"] && hasBib) {
  cmd.push("--citeproc");
  cmd.push(`--bibliography="${bibFile}"`);
  if (cslFile) {
    cmd.push(`--csl="${cslFile}"`);
  }
  console.log(`  Bibliography: ${relative(projectDir, bibFile)}`);
}

if (!values["no-toc"] && !hasTocMarker) {
  cmd.push("--toc", "--toc-depth=3");
} else if (hasTocMarker) {
  console.log("  TOC: using <!-- toc --> marker from content");
}

// ---------------------------------------------------------------------------
// Step 6: Execute pandoc
// ---------------------------------------------------------------------------

const fullCmd = cmd.join(" ");
console.log(`\nRunning pandoc...`);

try {
  execSync(fullCmd, {
    cwd: projectDir,
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 300_000,
  });
} catch (err: any) {
  console.error("Pandoc failed:");
  console.error(err.stderr?.toString() || err.message);
  rmSync(tmpDir, { recursive: true, force: true });
  process.exit(1);
}

// Clean up temp files
rmSync(tmpDir, { recursive: true, force: true });

const sizeKb = Math.round(
  readFileSync(outputPath).byteLength / 1024
);
console.log(`\n✓ Exported: ${outputPath} (${sizeKb} KB)`);

// ---------------------------------------------------------------------------
// Step 6.5: Generic Chinese thesis post-processing
// ---------------------------------------------------------------------------

if (!values["no-postprocess"]) {
  const postprocessScript = join(__dirname, "postprocess-docx.ts");
  if (existsSync(postprocessScript)) {
    console.log("  Post-process: generic Chinese thesis DOCX styles");
    execFileSync(
      "npx",
      ["tsx", postprocessScript, outputPath],
      {
        cwd: projectDir,
        stdio: "inherit",
        timeout: 300_000,
      }
    );
  } else {
    console.warn("  Warning: postprocess-docx.ts not found; skipping generic thesis styles");
  }
}

// ---------------------------------------------------------------------------
// Step 7: Version tag (optional, delegated to version.ts)
// ---------------------------------------------------------------------------

if (values.version) {
  const versionTag = values.version;
  const versionScript = join(__dirname, "version.ts");
  const stagingDocx = join(outDir, ".latest-export.docx");

  // Keep version.ts as the single source of truth for version tagging.
  copyFileSync(outputPath, stagingDocx);

  try {
    execFileSync(
      "npx",
      ["tsx", versionScript, projectDir, "tag", versionTag],
      {
        cwd: projectDir,
        stdio: "inherit",
        timeout: 300_000,
      }
    );
  } finally {
    rmSync(stagingDocx, { force: true });
  }
}

console.log("\nDone!");
