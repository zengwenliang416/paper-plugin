#!/usr/bin/env npx tsx
/**
 * render-docx.ts - DOCX -> page PNG renderer for visual QA.
 *
 * Converts a DOCX to PDF with LibreOffice in an isolated profile, rasterizes
 * the PDF into page-<N>.png images, writes a render report, and can append a
 * reviewed render row to .paper-context/ledgers/docx.tsv.
 */
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import JSZip from "jszip";

const DOCX_LEDGER_COLUMNS = [
  "output_path",
  "package_valid",
  "render_checked",
  "status",
  "renderer",
  "page_count",
  "png_dir",
  "pdf_path",
  "reviewed_pages",
  "reviewer",
  "checked_at",
  "notes",
];

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: "boolean", short: "h" },
    "output-dir": { type: "string", short: "o" },
    dpi: { type: "string" },
    "emit-pdf": { type: "boolean" },
    "context-project": { type: "string" },
    "mark-reviewed": { type: "boolean" },
    reviewer: { type: "string" },
    notes: { type: "string" },
    "keep-temp": { type: "boolean" },
    verbose: { type: "boolean" },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`Usage: npx tsx scripts/render-docx.ts <file.docx> --output-dir <dir> [options]

Options:
  -o, --output-dir <dir>     Directory for page-<N>.png files and render-report.json
  --dpi <number>             PNG raster DPI (default: 144)
  --emit-pdf                 Keep the intermediate PDF in --output-dir
  --context-project <dir>    Append a DOCX render row to .paper-context/ledgers/docx.tsv
  --mark-reviewed            Mark the ledger row as visually verified after page PNG review
  --reviewer <name>          Reviewer name for --mark-reviewed
  --notes <text>             Notes stored in the render report and context ledger
  --keep-temp                Keep temporary LibreOffice/PDF workspace for debugging
  --verbose                  Print renderer commands and paths
  -h, --help                 Show help

Final-delivery rule: only use --mark-reviewed after every rendered page PNG has
been visually inspected.`);
  process.exit(0);
}

const inputPath = resolve(positionals[0]);
if (!existsSync(inputPath)) {
  console.error(`Error: DOCX not found: ${inputPath}`);
  process.exit(1);
}
if (extname(inputPath).toLowerCase() !== ".docx") {
  console.error("Error: input must be a .docx file");
  process.exit(1);
}

const outputDir = values["output-dir"]
  ? resolve(values["output-dir"])
  : join(dirname(inputPath), `${basename(inputPath, ".docx")}-render`);
const dpi = Number(values.dpi || 144);
if (!Number.isInteger(dpi) || dpi < 72 || dpi > 600) {
  console.error("Error: --dpi must be an integer between 72 and 600");
  process.exit(1);
}

function log(message: string): void {
  if (values.verbose) console.log(message);
}

function fileUri(path: string): string {
  return `file://${path.replace(/ /g, "%20")}`;
}

function isExecutableCandidate(command: string, versionArgs = ["--version"]): boolean {
  if (command.includes("/") && !existsSync(command)) return false;
  try {
    execFileSync(command, versionArgs, {
      stdio: ["ignore", "ignore", "ignore"],
      timeout: 10_000,
    });
    return true;
  } catch {
    return false;
  }
}

function findCommand(candidates: Array<string | undefined>, versionArgs = ["--version"]): string | null {
  for (const candidate of candidates.filter(Boolean) as string[]) {
    if (isExecutableCandidate(candidate, versionArgs)) return candidate;
  }
  return null;
}

function findLibreOffice(): string {
  const command = findCommand([
    process.env.LIBREOFFICE_PATH,
    "soffice",
    "libreoffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  ]);
  if (!command) {
    throw new Error("LibreOffice/soffice was not found. Install LibreOffice or set LIBREOFFICE_PATH.");
  }
  return command;
}

function findPdfRasterizer(): { command: string; kind: "pdftoppm" | "magick" | "convert" } {
  const pdftoppm = findCommand(["pdftoppm"], ["-v"]);
  if (pdftoppm) return { command: pdftoppm, kind: "pdftoppm" };
  const magick = findCommand(["magick"], ["-version"]);
  if (magick) return { command: magick, kind: "magick" };
  const convert = findCommand(["convert"], ["-version"]);
  if (convert) return { command: convert, kind: "convert" };
  throw new Error("No PDF-to-PNG renderer found. Install poppler (pdftoppm) or ImageMagick.");
}

async function assertDocxPackage(path: string): Promise<boolean> {
  const zip = await JSZip.loadAsync(readFileSync(path));
  return Boolean(zip.file("word/document.xml"));
}

function cleanupOldPages(dir: string): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (/^page-[0-9]+\.png$/i.test(name)) {
      rmSync(join(dir, name), { force: true });
    }
  }
}

function listPagePngs(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => /^page-[0-9]+\.png$/i.test(name))
    .sort((a, b) => {
      const an = Number(a.match(/[0-9]+/)?.[0] ?? 0);
      const bn = Number(b.match(/[0-9]+/)?.[0] ?? 0);
      return an - bn;
    })
    .map((name) => join(dir, name));
}

function normalizePageNames(dir: string): string[] {
  const pages = listPagePngs(dir);
  const tempNames: string[] = [];
  pages.forEach((page, index) => {
    const temp = join(dir, `.page-normalize-${index + 1}.png`);
    renameSync(page, temp);
    tempNames.push(temp);
  });
  tempNames.forEach((temp, index) => {
    renameSync(temp, join(dir, `page-${index + 1}.png`));
  });
  return listPagePngs(dir);
}

function convertDocxToPdf(loCommand: string, tempRoot: string): string {
  const loOut = join(tempRoot, "lo-out");
  const loHome = join(tempRoot, "home");
  const loProfile = join(tempRoot, "lo-profile");
  mkdirSync(loOut, { recursive: true });
  mkdirSync(loHome, { recursive: true });
  mkdirSync(loProfile, { recursive: true });

  const args = [
    "--headless",
    "--nologo",
    "--nofirststartwizard",
    "--nodefault",
    "--nolockcheck",
    `-env:UserInstallation=${fileUri(loProfile)}`,
    "--convert-to",
    "pdf",
    "--outdir",
    loOut,
    inputPath,
  ];

  log(`LibreOffice: ${loCommand} ${args.join(" ")}`);
  execFileSync(loCommand, args, {
    env: { ...process.env, HOME: loHome },
    stdio: values.verbose ? "inherit" : ["ignore", "pipe", "pipe"],
    timeout: 300_000,
  });

  const expected = join(loOut, `${basename(inputPath, ".docx")}.pdf`);
  if (existsSync(expected)) return expected;

  const pdfs = readdirSync(loOut).filter((name) => name.toLowerCase().endsWith(".pdf"));
  if (pdfs.length === 1) return join(loOut, pdfs[0]);
  throw new Error(`LibreOffice did not produce a PDF in ${loOut}`);
}

function rasterizePdf(
  pdfPath: string,
  rasterizer: { command: string; kind: "pdftoppm" | "magick" | "convert" }
): void {
  if (rasterizer.kind === "pdftoppm") {
    const args = ["-png", "-r", String(dpi), pdfPath, join(outputDir, "page")];
    log(`pdftoppm: ${rasterizer.command} ${args.join(" ")}`);
    execFileSync(rasterizer.command, args, {
      stdio: values.verbose ? "inherit" : ["ignore", "pipe", "pipe"],
      timeout: 300_000,
    });
    return;
  }

  const args = ["-density", String(dpi), pdfPath, join(outputDir, "page-%d.png")];
  log(`${rasterizer.kind}: ${rasterizer.command} ${args.join(" ")}`);
  execFileSync(rasterizer.command, args, {
    stdio: values.verbose ? "inherit" : ["ignore", "pipe", "pipe"],
    timeout: 300_000,
  });
}

function projectRelative(projectDir: string, path: string): string {
  const rel = relative(projectDir, path).replace(/\\/g, "/");
  return rel && !rel.startsWith("..") ? rel : path;
}

function readLedger(path: string): Record<string, string>[] {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split("\t").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split("\t");
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index]?.trim() ?? "";
    });
    return row;
  });
}

function writeLedger(path: string, rows: Record<string, string>[]): void {
  mkdirSync(dirname(path), { recursive: true });
  const body = rows.map((row) =>
    DOCX_LEDGER_COLUMNS.map((column) => (row[column] ?? "").replace(/\t|\r?\n/g, " ")).join("\t")
  );
  writeFileSync(path, `${DOCX_LEDGER_COLUMNS.join("\t")}\n${body.join("\n")}${body.length ? "\n" : ""}`, "utf8");
}

function appendContextLedger(report: any): string | null {
  if (!values["context-project"]) return null;
  const projectDir = resolve(values["context-project"]);
  const ledgerPath = join(projectDir, ".paper-context", "ledgers", "docx.tsv");
  const rows = readLedger(ledgerPath);
  const reviewed = Boolean(values["mark-reviewed"]);
  rows.push({
    output_path: projectRelative(projectDir, inputPath),
    package_valid: report.packageValid ? "yes" : "no",
    render_checked: reviewed ? "yes" : "no",
    status: reviewed ? "verified" : "rendered_unreviewed",
    renderer: report.renderer,
    page_count: String(report.pageCount),
    png_dir: projectRelative(projectDir, outputDir),
    pdf_path: report.pdfPath ? projectRelative(projectDir, report.pdfPath) : "",
    reviewed_pages: reviewed ? "all" : "none",
    reviewer: reviewed ? String(values.reviewer || "codex") : "",
    checked_at: reviewed ? report.generatedAt : "",
    notes: String(values.notes || (reviewed
      ? "All rendered page PNGs visually inspected before final delivery."
      : "Rendered PNGs still require visual inspection before final delivery.")),
  });
  writeLedger(ledgerPath, rows);
  return ledgerPath;
}

async function main(): Promise<void> {
  mkdirSync(outputDir, { recursive: true });
  cleanupOldPages(outputDir);

  const tempRoot = mkdtempSync(join(tmpdir(), "paper-docx-render-"));
  let tempPdf = "";
  try {
    const packageValid = await assertDocxPackage(inputPath);
    if (!packageValid) throw new Error("DOCX package is missing word/document.xml");

    const loCommand = findLibreOffice();
    const rasterizer = findPdfRasterizer();
    tempPdf = convertDocxToPdf(loCommand, tempRoot);
    rasterizePdf(tempPdf, rasterizer);
    const pages = normalizePageNames(outputDir);
    if (pages.length === 0) {
      throw new Error("Render completed without page PNGs; do not claim visual QA passed.");
    }

    const emittedPdfPath = values["emit-pdf"]
      ? join(outputDir, `${basename(inputPath, ".docx")}.pdf`)
      : "";
    if (emittedPdfPath) copyFileSync(tempPdf, emittedPdfPath);

    const generatedAt = new Date().toISOString();
    const report = {
      input: inputPath,
      outputDir,
      generatedAt,
      packageValid,
      renderer: `libreoffice+${rasterizer.kind}`,
      dpi,
      pageCount: pages.length,
      pngPages: pages,
      pdfPath: emittedPdfPath,
      reviewRequired: !values["mark-reviewed"],
      reviewed: Boolean(values["mark-reviewed"]),
      reviewer: values["mark-reviewed"] ? String(values.reviewer || "codex") : "",
      notes: values.notes || "",
    };
    const ledgerPath = appendContextLedger(report);
    const reportWithLedger = { ...report, contextLedger: ledgerPath };
    writeFileSync(join(outputDir, "render-report.json"), JSON.stringify(reportWithLedger, null, 2) + "\n", "utf8");
    console.log(JSON.stringify(reportWithLedger, null, 2));
  } finally {
    if (!values["keep-temp"]) rmSync(tempRoot, { recursive: true, force: true });
    else console.error(`Temporary render workspace kept at: ${tempRoot}`);
  }
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
