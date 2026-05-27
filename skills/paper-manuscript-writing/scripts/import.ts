#!/usr/bin/env npx tsx
/**
 * import.ts — DOCX → Markdown importer for thesis projects.
 *
 * Converts a Word thesis document into a structured thesis project:
 *   - Splits content into per-chapter Markdown files
 *   - Extracts images to assets/images/
 *   - Extracts cover page metadata → thesis.yaml
 *   - Creates project directory structure
 */
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import JSZip from "jszip";
import YAML from "yaml";
import { ensureDeps } from "./check-deps.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "output-dir": { type: "string", short: "o" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`Usage: npx tsx scripts/import.ts <thesis.docx|.doc> -o <output-dir>

Options:
  -o, --output-dir  Output project directory (default: ./thesis-project)
  -h, --help        Show help`);
  process.exit(0);
}

const inputPath = resolve(positionals[0]);
const outputDir = resolve(values["output-dir"] ?? "./thesis-project");

if (!existsSync(inputPath)) {
  console.error(`Error: file not found: ${inputPath}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Step 1: Ensure dependencies + convert .doc if needed
// ---------------------------------------------------------------------------

const ext = extname(inputPath).toLowerCase();
let docxPath = inputPath;

if (ext === ".doc") {
  ensureDeps(["pandoc", "soffice"]);
  console.log("Converting .doc → .docx via LibreOffice...");
  const tmpDir = join(dirname(inputPath), ".tmp-import");
  mkdirSync(tmpDir, { recursive: true });
  execSync(`soffice --headless --convert-to docx "${inputPath}" --outdir "${tmpDir}"`, {
    stdio: "pipe",
    timeout: 120_000,
  });
  const name = basename(inputPath, ext) + ".docx";
  docxPath = join(tmpDir, name);
  if (!existsSync(docxPath)) {
    console.error("Error: LibreOffice conversion failed");
    process.exit(1);
  }
  console.log(`  → ${docxPath}`);
} else if (ext === ".docx") {
  ensureDeps(["pandoc"]);
} else {
  console.error(`Error: unsupported format "${ext}". Use .doc or .docx`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Step 2: Create project directories
// ---------------------------------------------------------------------------

const contentDir = join(outputDir, "content");
const assetsDir = join(outputDir, "assets");
const imagesDir = join(assetsDir, "images");
const outputOutDir = join(outputDir, "output");

for (const d of [contentDir, imagesDir, outputOutDir]) {
  mkdirSync(d, { recursive: true });
}

// ---------------------------------------------------------------------------
// Step 3: Pandoc conversion to Markdown
// ---------------------------------------------------------------------------

console.log("Converting DOCX → Markdown via pandoc...");
const fullMdPath = join(outputDir, ".full-import.md");

execSync(
  `pandoc "${docxPath}" -t markdown+tex_math_dollars --extract-media="${assetsDir}" --wrap=none -o "${fullMdPath}"`,
  { stdio: "pipe", timeout: 120_000 }
);

const fullMd = readFileSync(fullMdPath, "utf-8");
console.log(`  → ${fullMd.split("\n").length} lines`);

// ---------------------------------------------------------------------------
// Step 4: Extract metadata from DOCX cover page via JSZip
// ---------------------------------------------------------------------------

console.log("Extracting cover page metadata...");

interface ThesisMeta {
  title: string;
  author: string;
  school: string;
  department: string;
  major: string;
  advisor: string;
  advisorTitle: string;
  date: string;
  studentId: string;
  language: string;
  citationStyle: string;
  chapters: string[];
}

async function extractMetaFromDocx(docxFile: string): Promise<Partial<ThesisMeta>> {
  const buf = readFileSync(docxFile);
  const zip = await JSZip.loadAsync(buf);
  const docXml = await zip.file("word/document.xml")?.async("text");
  if (!docXml) return {};

  const meta: Partial<ThesisMeta> = {};

  // Extract text content from the first ~2000 chars of document body for cover page fields
  // Remove XML tags to get plain text
  const plainText = docXml
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .slice(0, 5000);

  // Try to extract common cover fields from text patterns
  const patterns: [keyof ThesisMeta, RegExp][] = [
    ["author", /(?:研\s*究\s*生\s*姓\s*名|姓\s*名)[：:]\s*(\S+)/],
    ["studentId", /(?:学\s*号)[：:]\s*(\S+)/],
    ["department", /(?:所\s*在\s*学\s*院|院\s*系)[：:]\s*(\S+)/],
    ["major", /(?:学\s*科\s*专\s*业|专\s*业)[：:]\s*(\S+)/],
    ["advisor", /(?:指导教师|导\s*师)[^：:]*[：:]\s*(\S+)/],
  ];

  for (const [key, re] of patterns) {
    const m = plainText.match(re);
    if (m) meta[key] = m[1].trim();
  }

  // Try to find university name (usually a line containing "大学" or "学院")
  const schoolMatch = plainText.match(/([\u4e00-\u9fff\s]+(?:大学|学院))/);
  if (schoolMatch) {
    meta.school = schoolMatch[1].replace(/\s+/g, "").trim();
  }

  return meta;
}

// ---------------------------------------------------------------------------
// Step 5: Split markdown into chapters
// ---------------------------------------------------------------------------

interface Chapter {
  filename: string;
  title: string;
  content: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

const SPECIAL_SECTIONS: Record<string, string> = {
  "摘要": "abstract.md",
  "摘 要": "abstract.md",
  "abstract": "abstract-en.md",
  "致谢": "acknowledgment.md",
  "致 谢": "acknowledgment.md",
  "参考文献": "references.md",
  "references": "references.md",
  "bibliography": "references.md",
  "附录": "appendix.md",
  "附 录": "appendix.md",
  "appendix": "appendix.md",
  "目录": null as unknown as string, // skip TOC
  "目 录": null as unknown as string,
};

function isChapterLevel(title: string): boolean {
  const normalized = title.replace(/\s+/g, " ").toLowerCase();
  // Special sections that should be their own files
  for (const key of Object.keys(SPECIAL_SECTIONS)) {
    if (normalized === key.toLowerCase() || normalized.startsWith(key.toLowerCase())) {
      return true;
    }
  }
  // Numbered chapters: 第X章
  if (/第[一二三四五六七八九十\d]+章/.test(title)) return true;
  // Other top-level sections without numbering (e.g. "结论与展望", "图表索引")
  // These don't have "X.Y" numbering pattern
  if (!/^\d+\.\d+/.test(title.trim())) return true;
  return false;
}

function splitChapters(md: string): Chapter[] {
  const lines = md.split("\n");
  const chapters: Chapter[] = [];
  let current: { title: string; lines: string[]; level: number } | null = null;
  let chapterCount = 0;

  for (const line of lines) {
    // Match H1 (# ) or H2 (## ) headers
    const h1Match = line.match(/^#\s+(.+)$/);
    const h2Match = line.match(/^##\s+(.+)$/);
    // Match pandoc anchor format: []{#__RefHeading_... .anchor}Title Text
    const anchorMatch = line.match(/^\[\]\{#[^\}]+\.anchor\}\s*(.+)$/);
    const headerMatch = h1Match || h2Match || anchorMatch;

    if (headerMatch) {
      const title = headerMatch[1].trim().replace(/\*\*/g, "");
      const titleLower = title.toLowerCase().replace(/\s+/g, " ");

      // Check if this is a TOC heading (skip entirely)
      const specialKey = Object.keys(SPECIAL_SECTIONS).find(
        (k) => titleLower === k.toLowerCase() || titleLower.startsWith(k.toLowerCase())
      );
      if (specialKey && SPECIAL_SECTIONS[specialKey] === null) {
        current = null;
        continue;
      }

      // Only split at chapter-level headings (第X章, 摘要, 参考文献, etc.)
      // Sub-sections (1.1, 1.1.1, etc.) stay within the current chapter
      if (isChapterLevel(title)) {
        // Save previous chapter
        if (current) {
          const ch = finalizeChapter(current.title, current.lines, chapterCount);
          if (ch) chapters.push(ch);
        }

        const isNumberedChapter = /第[一二三四五六七八九十\d]+章/.test(title);
        if (isNumberedChapter) chapterCount++;

        current = { title, lines: [line], level: (h1Match || anchorMatch) ? 1 : 2 };
      } else if (current) {
        // Sub-section heading: keep it in current chapter
        current.lines.push(line);
      }
    } else if (current) {
      current.lines.push(line);
    }
  }

  // Save last chapter
  if (current) {
    const ch = finalizeChapter(current.title, current.lines, chapterCount);
    if (ch) chapters.push(ch);
  }

  return chapters;
}

function finalizeChapter(
  title: string,
  lines: string[],
  chapterIndex: number
): Chapter | null {
  const content = lines.join("\n").trim();
  if (!content) return null;

  const titleLower = title.toLowerCase().replace(/\s+/g, " ");

  // Check special sections
  for (const [key, filename] of Object.entries(SPECIAL_SECTIONS)) {
    if (filename && (titleLower === key.toLowerCase() || titleLower.startsWith(key.toLowerCase()))) {
      return { filename, title, content };
    }
  }

  // Numbered chapter
  const chapterMatch = title.match(/第[一二三四五六七八九十\d]+章/);
  if (chapterMatch) {
    const num = String(chapterIndex).padStart(2, "0");
    const slug = slugify(title.replace(/第[一二三四五六七八九十\d]+章\s*/, ""));
    return {
      filename: `ch${num}-${slug || "chapter"}.md`,
      title,
      content,
    };
  }

  // Generic section
  const slug = slugify(title);
  return {
    filename: `section-${slug || "unknown"}.md`,
    title,
    content,
  };
}

// ---------------------------------------------------------------------------
// Step 6: Fix image paths in markdown
// ---------------------------------------------------------------------------

function fixImagePaths(content: string): string {
  // Pandoc extracts to assets/media/... — rewrite to ../assets/media/...
  return content.replace(
    /!\[([^\]]*)\]\(assets\//g,
    "![$1](../assets/"
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Extract metadata
  const meta = await extractMetaFromDocx(docxPath);

  // Try to extract title from first H1 in markdown
  const titleMatch = fullMd.match(/^#\s+(.+)$/m);
  if (titleMatch && !meta.title) {
    meta.title = titleMatch[1].replace(/\*\*/g, "").trim();
  }

  // Also try to find title from bold text near the start (common in thesis covers)
  if (!meta.title) {
    const boldMatch = fullMd.slice(0, 2000).match(/\*\*(.{10,80})\*\*/);
    if (boldMatch) meta.title = boldMatch[1].trim();
  }

  // Split into chapters
  const chapters = splitChapters(fullMd);
  console.log(`  Found ${chapters.length} sections`);

  // Write chapter files
  const chapterFiles: string[] = [];
  for (const ch of chapters) {
    const content = fixImagePaths(ch.content);
    const filePath = join(contentDir, ch.filename);
    writeFileSync(filePath, content, "utf-8");
    chapterFiles.push(ch.filename);
    console.log(`  → content/${ch.filename} (${ch.title})`);
  }

  // Write thesis.yaml
  const thesisConfig = {
    title: meta.title || "[论文标题]",
    author: meta.author || "[作者姓名]",
    school: meta.school || "[学校名称]",
    department: meta.department || "[学院]",
    major: meta.major || "[专业]",
    advisor: meta.advisor || "[指导教师]",
    advisorTitle: meta.advisorTitle || "",
    studentId: meta.studentId || "[学号]",
    date: meta.date || new Date().toISOString().slice(0, 7),
    language: "zh-CN",
    citationStyle: "gbt7714-numeric",
    chapters: chapterFiles,
  };

  const yamlPath = join(outputDir, "thesis.yaml");
  writeFileSync(yamlPath, YAML.stringify(thesisConfig), "utf-8");
  console.log(`  → thesis.yaml`);

  // Create empty refs.bib
  const bibPath = join(assetsDir, "refs.bib");
  if (!existsSync(bibPath)) {
    writeFileSync(bibPath, "% BibTeX references for thesis\n% Add entries with: npx tsx scripts/ref-search.ts doi <DOI> --bib assets/refs.bib\n", "utf-8");
    console.log(`  → assets/refs.bib (empty)`);
  }

  // Create .thesis.json
  const stateFile = join(outputDir, ".thesis.json");
  if (!existsSync(stateFile)) {
    writeFileSync(
      stateFile,
      JSON.stringify({ versions: [], currentStage: 0, stageHistory: [] }, null, 2),
      "utf-8"
    );
    console.log(`  → .thesis.json`);
  }

  const contextScript = join(__dirname, "context.ts");
  if (existsSync(contextScript)) {
    try {
      execFileSync("npx", ["tsx", contextScript, "init", outputDir], {
        cwd: outputDir,
        stdio: "inherit",
        timeout: 120_000,
      });
      execFileSync("npx", ["tsx", contextScript, "snapshot", outputDir, "--label", "import"], {
        cwd: outputDir,
        stdio: "inherit",
        timeout: 120_000,
      });
    } catch (err: any) {
      console.warn(`  Warning: context initialization failed: ${err.message}`);
    }
  }

  // Clean up temporary files
  if (existsSync(fullMdPath)) rmSync(fullMdPath);
  if (ext === ".doc") {
    const tmpDir = join(dirname(inputPath), ".tmp-import");
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
  }

  // Move extracted media from assets/media/ to assets/images/ if pandoc put them there
  const mediaDir = join(assetsDir, "media");
  if (existsSync(mediaDir)) {
    console.log(`  Images extracted to assets/media/`);
  }

  console.log(`\nDone! Project created at: ${outputDir}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Review thesis.yaml and fill in missing metadata`);
  console.log(`  2. Check content/*.md files for formatting issues`);
  console.log(`  3. Verify extracted images in assets/`);
  console.log(`  4. Run: npx tsx scripts/export.ts ${outputDir} -o thesis.docx`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
