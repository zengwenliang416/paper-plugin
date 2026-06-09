#!/usr/bin/env npx tsx
/**
 * render-latex.ts — LaTeX/PDF → page PNG renderer for visual QA.
 *
 * Compiles a .tex with latexmk/pdflatex (or takes a ready .pdf), rasterizes the
 * PDF into page-<N>.png, and writes render-report.json. The LaTeX-track parallel
 * to paper-docx-repair/render-docx.ts. Needs a local TeX for .tex input; PDF
 * rasterization needs poppler (pdftoppm) or ImageMagick.
 *
 * Usage:
 *   render-latex.ts <file.tex> --output-dir <dir>
 *   render-latex.ts <file.pdf> --output-dir <dir>   # skip compile
 */
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: "boolean", short: "h" },
    "output-dir": { type: "string", short: "o" },
    dpi: { type: "string" },
    "emit-pdf": { type: "boolean" },
    "keep-temp": { type: "boolean" },
    verbose: { type: "boolean" },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`Usage: npx tsx scripts/render-latex.ts <file.tex|file.pdf> --output-dir <dir> [options]

Options:
  -o, --output-dir <dir>   Directory for page-<N>.png + render-report.json
  --dpi <number>           Raster DPI (default 144)
  --emit-pdf               Keep the compiled/used PDF in --output-dir
  --keep-temp              Keep the temp compile workspace
  --verbose                Print commands
  -h, --help               Show help

.tex input needs latexmk/pdflatex; rasterization needs pdftoppm or ImageMagick.
Visual QA passes only after every page PNG is inspected.`);
  process.exit(0);
}

const inputPath = resolve(positionals[0]);
if (!existsSync(inputPath)) {
  console.error(`Error: input not found: ${inputPath}`);
  process.exit(1);
}
const ext = extname(inputPath).toLowerCase();
if (ext !== ".tex" && ext !== ".pdf") {
  console.error("Error: input must be a .tex or .pdf file");
  process.exit(1);
}

const outputDir = values["output-dir"]
  ? resolve(values["output-dir"])
  : join(dirname(inputPath), `${basename(inputPath, ext)}-render`);
const dpi = Number(values.dpi || 144);
if (!Number.isInteger(dpi) || dpi < 72 || dpi > 600) {
  console.error("Error: --dpi must be an integer between 72 and 600");
  process.exit(1);
}

function log(message: string): void {
  if (values.verbose) console.log(message);
}

function isExecutable(command: string, versionArgs = ["--version"]): boolean {
  if (command.includes("/") && !existsSync(command)) return false;
  try {
    execFileSync(command, versionArgs, { stdio: ["ignore", "ignore", "ignore"], timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}
function findCommand(candidates: Array<string | undefined>, versionArgs = ["--version"]): string | null {
  for (const c of candidates.filter(Boolean) as string[]) if (isExecutable(c, versionArgs)) return c;
  return null;
}
function findRasterizer(): { command: string; kind: "pdftoppm" | "magick" | "convert" } {
  const pdftoppm = findCommand(["pdftoppm"], ["-v"]);
  if (pdftoppm) return { command: pdftoppm, kind: "pdftoppm" };
  const magick = findCommand(["magick"], ["-version"]);
  if (magick) return { command: magick, kind: "magick" };
  const convert = findCommand(["convert"], ["-version"]);
  if (convert) return { command: convert, kind: "convert" };
  throw new Error("No PDF-to-PNG renderer found. Install poppler (pdftoppm) or ImageMagick.");
}

function compileTex(tempRoot: string): { pdf: string; compileOk: boolean } {
  const compiler = findCommand([process.env.LATEXMK_PATH, "latexmk", "pdflatex"]);
  if (!compiler) {
    throw new Error("latexmk/pdflatex not found. Install a TeX distribution or set LATEXMK_PATH.");
  }
  const isLatexmk = compiler.includes("latexmk");
  const args = isLatexmk
    ? ["-pdf", "-interaction=nonstopmode", `-outdir=${tempRoot}`, inputPath]
    : ["-interaction=nonstopmode", "-output-directory", tempRoot, inputPath];
  let compileOk = true;
  try {
    log(`compile: ${compiler} ${args.join(" ")}`);
    execFileSync(compiler, args, {
      cwd: dirname(inputPath),
      stdio: values.verbose ? "inherit" : ["ignore", "pipe", "pipe"],
      timeout: 300_000,
    });
  } catch {
    compileOk = false; // nonstopmode can still emit a partial PDF
  }
  const pdf = join(tempRoot, `${basename(inputPath, ".tex")}.pdf`);
  if (!existsSync(pdf)) {
    throw new Error("compile produced no PDF; diagnose the build log with latex-diagnose.ts");
  }
  return { pdf, compileOk };
}

function rasterize(pdfPath: string, r: { command: string; kind: string }): void {
  const stdio = values.verbose ? "inherit" : (["ignore", "pipe", "pipe"] as const);
  if (r.kind === "pdftoppm") {
    execFileSync(r.command, ["-png", "-r", String(dpi), pdfPath, join(outputDir, "page")], { stdio, timeout: 300_000 });
    return;
  }
  execFileSync(r.command, ["-density", String(dpi), pdfPath, join(outputDir, "page-%d.png")], { stdio, timeout: 300_000 });
}

function listPages(): string[] {
  return readdirSync(outputDir)
    .filter((n) => /^page-[0-9]+\.png$/i.test(n))
    .sort((a, b) => Number(a.match(/[0-9]+/)?.[0] ?? 0) - Number(b.match(/[0-9]+/)?.[0] ?? 0))
    .map((n) => join(outputDir, n));
}
function normalizePages(): string[] {
  const pages = listPages();
  const temps = pages.map((p, i) => {
    const t = join(outputDir, `.norm-${i + 1}.png`);
    renameSync(p, t);
    return t;
  });
  temps.forEach((t, i) => renameSync(t, join(outputDir, `page-${i + 1}.png`)));
  return listPages();
}
function cleanupOldPages(): void {
  if (!existsSync(outputDir)) return;
  for (const n of readdirSync(outputDir)) if (/^page-[0-9]+\.png$/i.test(n)) rmSync(join(outputDir, n), { force: true });
}

async function main(): Promise<void> {
  mkdirSync(outputDir, { recursive: true });
  cleanupOldPages();
  const rasterizer = findRasterizer();
  const tempRoot = mkdtempSync(join(tmpdir(), "paper-latex-render-"));
  let compileOk = true;
  try {
    let pdf = inputPath;
    if (ext === ".tex") {
      const result = compileTex(tempRoot);
      pdf = result.pdf;
      compileOk = result.compileOk;
    }
    rasterize(pdf, rasterizer);
    const pages = normalizePages();
    if (pages.length === 0) throw new Error("Render produced no page PNGs; do not claim visual QA passed.");
    if (values["emit-pdf"]) copyFileSync(pdf, join(outputDir, `${basename(inputPath, ext)}.pdf`));
    const report = {
      input: inputPath,
      outputDir,
      generatedAt: new Date().toISOString(),
      renderer: `${ext === ".tex" ? "latex+" : ""}${rasterizer.kind}`,
      compileOk,
      dpi,
      pageCount: pages.length,
      pngPages: pages,
      reviewRequired: true,
      note: compileOk ? "" : "compile reported errors (partial PDF rendered); run latex-diagnose.ts on the log",
    };
    writeFileSync(join(outputDir, "render-report.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (!values["keep-temp"]) rmSync(tempRoot, { recursive: true, force: true });
    else console.error(`Temp workspace kept at: ${tempRoot}`);
  }
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
