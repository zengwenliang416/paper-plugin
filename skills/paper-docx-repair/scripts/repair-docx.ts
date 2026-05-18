#!/usr/bin/env npx tsx
/**
 * repair-docx.ts - targeted DOCX repair and scan tooling.
 *
 * This script edits OOXML directly for common post-delivery Word issues:
 * table paragraph first-line indents, REF field formatting, TOC styles, and
 * opt-in figure/table text reference conversion.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import JSZip from "jszip";

type RepairReport = {
  input: string;
  output?: string;
  scanOnly: boolean;
  options: Record<string, boolean | string | undefined>;
  statsBefore: DocxStats;
  statsAfter?: DocxStats;
  changes: Record<string, number>;
  warnings: string[];
};

type DocxStats = {
  paragraphs: number;
  tables: number;
  tableParagraphs: number;
  tableParagraphsWithDirectFirstLineOrHangingIndent: number;
  captionLabels: string[];
  bodyReferenceLabels: string[];
  refFields: number;
  refFieldsWithoutCharformat: number;
  tocResultParagraphs: Record<string, number>;
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: "boolean", short: "h" },
    scan: { type: "boolean" },
    output: { type: "string", short: "o" },
    "in-place": { type: "boolean" },
    "backup-dir": { type: "string" },
    report: { type: "string" },
    "fix-crossrefs": { type: "boolean" },
    "no-table-indents": { type: "boolean" },
    "no-ref-charformat": { type: "boolean" },
    "no-toc-styles": { type: "boolean" },
    "no-update-fields": { type: "boolean" },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`Usage: npx tsx scripts/repair-docx.ts <file.docx> [options]

Options:
  --scan                 Inspect only; do not write an output DOCX
  -o, --output <path>    Write repaired DOCX to this path
  --in-place             Repair the input DOCX after creating a backup
  --backup-dir <path>    Backup directory for --in-place (default: _archive/docx_backups)
  --report <path>        Write the JSON repair report to a file
  --fix-crossrefs        Convert body 图/表 references into Word REF fields when safe
  --no-table-indents     Skip table paragraph first-line/hanging indent cleanup
  --no-ref-charformat    Skip REF field CHARFORMAT normalization
  --no-toc-styles        Skip TOC1/TOC2/TOC3 style normalization
  --no-update-fields     Skip Word update-fields setting
  -h, --help             Show help`);
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

const scanOnly = Boolean(values.scan);
const options = {
  fixTableIndents: !values["no-table-indents"],
  fixRefCharformat: !values["no-ref-charformat"],
  fixTocStyles: !values["no-toc-styles"],
  fixUpdateFields: !values["no-update-fields"],
  fixCrossrefs: Boolean(values["fix-crossrefs"]),
};

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlUnescape(text: string): string {
  return text
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function extractText(xml: string): string {
  return Array.from(xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g))
    .map((match) => xmlUnescape(match[1] ?? ""))
    .join("");
}

function normalizeLabel(kind: string, number: string): string {
  return `${kind}${number.replace(/－/g, "-").replace(/\s+/g, "")}`;
}

function labelBookmarkName(label: string): string {
  const prefix = label.startsWith("表") ? "Table" : "Fig";
  const number = label.replace(/^[图表]/, "").replace(/[^0-9A-Za-z]+/g, "_");
  return `_RefDocxRepair_${prefix}_${number}`;
}

function captionLabelFromText(text: string): string | null {
  const match = text.match(/^\s*([图表])\s*([0-9]+[-－][0-9]+)/);
  return match ? normalizeLabel(match[1], match[2]) : null;
}

function labelsFromText(text: string): string[] {
  const labels: string[] = [];
  for (const match of text.matchAll(/([图表])\s*([0-9]+[-－][0-9]+)/g)) {
    labels.push(normalizeLabel(match[1], match[2]));
  }
  return labels;
}

function tocStyleFromText(text: string): string | null {
  const normalized = text.trim().replace(/\s+/g, "");
  if (/^(摘要|ABSTRACT|Abstract)\b/i.test(normalized)) return "TOC1";
  if (/^[0-9]+[.．][0-9]+[.．][0-9]+/.test(normalized)) return "TOC3";
  if (/^[0-9]+[.．][0-9]+/.test(normalized)) return "TOC2";
  if (/^[0-9]+[.．]/.test(normalized)) return "TOC1";
  return null;
}

function countTables(documentXml: string): number {
  return Array.from(documentXml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/g)).length;
}

function collectStats(documentXml: string): DocxStats {
  const paragraphs = Array.from(documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)).map((m) => m[0]);
  const tableXmls = Array.from(documentXml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/g)).map((m) => m[0]);
  const tableParagraphs = tableXmls.flatMap((tbl) =>
    Array.from(tbl.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)).map((m) => m[0])
  );

  const captionLabels: string[] = [];
  const bodyReferenceLabels: string[] = [];
  const tocResultParagraphs: Record<string, number> = {};

  for (const p of paragraphs) {
    const text = extractText(p);
    const caption = captionLabelFromText(text);
    if (caption) {
      captionLabels.push(caption);
      continue;
    }
    for (const label of labelsFromText(text)) {
      bodyReferenceLabels.push(label);
    }

    const style = p.match(/<w:pStyle\b[^>]*w:val="([^"]+)"/)?.[1];
    if (style?.startsWith("TOC")) {
      tocResultParagraphs[style] = (tocResultParagraphs[style] ?? 0) + 1;
    }
  }

  const refFieldTexts = Array.from(documentXml.matchAll(/<w:instrText\b[^>]*>([\s\S]*?)<\/w:instrText>/g))
    .map((match) => xmlUnescape(match[1] ?? ""))
    .filter((text) => /\bREF\s+/.test(text));

  return {
    paragraphs: paragraphs.length,
    tables: countTables(documentXml),
    tableParagraphs: tableParagraphs.length,
    tableParagraphsWithDirectFirstLineOrHangingIndent: tableParagraphs.filter((p) =>
      /<w:ind\b[^>]*w:(firstLine|firstLineChars|hanging|hangingChars)=/.test(p)
    ).length,
    captionLabels: Array.from(new Set(captionLabels)).sort(),
    bodyReferenceLabels: Array.from(new Set(bodyReferenceLabels)).sort(),
    refFields: refFieldTexts.length,
    refFieldsWithoutCharformat: refFieldTexts.filter((text) => !/\\\*\s+CHARFORMAT/.test(text)).length,
    tocResultParagraphs,
  };
}

function patchTableIndents(documentXml: string, changes: Record<string, number>): string {
  return documentXml.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/g, (tableXml) =>
    tableXml.replace(/<w:ind\b([^>]*)\/>/g, (match, attrs: string) => {
      if (!/\bw:(firstLine|firstLineChars|hanging|hangingChars)=/.test(attrs)) {
        return match;
      }
      changes.tableIndentsRemoved += 1;
      const cleaned = attrs.replace(/\s+w:(firstLine|firstLineChars|hanging|hangingChars)="[^"]*"/g, "");
      return /\bw:[A-Za-z0-9]+="/.test(cleaned) ? `<w:ind${cleaned}/>` : "";
    })
  );
}

function patchRefCharformat(documentXml: string, changes: Record<string, number>): string {
  return documentXml.replace(
    /(<w:instrText\b[^>]*>)([\s\S]*?)(<\/w:instrText>)/g,
    (match, open: string, rawText: string, close: string) => {
      const text = xmlUnescape(rawText);
      if (!/\bREF\s+/.test(text) || /\\\*\s+CHARFORMAT/.test(text)) {
        return match;
      }
      changes.refCharformatAdded += 1;
      return `${open}${xmlEscape(text.trimEnd() + " \\* CHARFORMAT ")}${close}`;
    }
  );
}

function replaceOrInsertStyle(stylesXml: string, styleId: string, styleXml: string): string {
  const escaped = styleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<w:style\\b[^>]*w:styleId="${escaped}"[^>]*>[\\s\\S]*?<\\/w:style>`);
  if (re.test(stylesXml)) return stylesXml.replace(re, styleXml);
  return stylesXml.replace("</w:styles>", `${styleXml}\n</w:styles>`);
}

function tocStyleXml(styleId: string, name: string, left: number): string {
  const indent = left > 0 ? `<w:ind w:left="${left}"/>` : "";
  return `<w:style w:type="paragraph" w:styleId="${styleId}">
  <w:name w:val="${name}"/>
  <w:basedOn w:val="Normal"/>
  <w:pPr>${indent}<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="8302"/></w:tabs></w:pPr>
  <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
</w:style>`;
}

function patchTocStyles(stylesXml: string, changes: Record<string, number>): string {
  let xml = stylesXml;
  const before = xml;
  xml = replaceOrInsertStyle(xml, "TOC1", tocStyleXml("TOC1", "toc 1", 0));
  xml = replaceOrInsertStyle(xml, "TOC2", tocStyleXml("TOC2", "toc 2", 420));
  xml = replaceOrInsertStyle(xml, "TOC3", tocStyleXml("TOC3", "toc 3", 840));
  if (xml !== before) changes.tocStylesNormalized += 1;
  return xml;
}

function patchTocResultParagraphs(documentXml: string, changes: Record<string, number>): string {
  return documentXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
    const style = paragraph.match(/<w:pStyle\b[^>]*w:val="([^"]+)"/)?.[1];
    if (!style?.startsWith("TOC")) return paragraph;
    if (style === "TOC") return paragraph;
    const target = tocStyleFromText(extractText(paragraph));
    if (!target || target === style) return paragraph;
    changes.tocParagraphLevelsNormalized += 1;
    return paragraph.replace(/(<w:pStyle\b[^>]*w:val=")([^"]+)(")/, `$1${target}$3`);
  });
}

function patchUpdateFields(settingsXml: string, changes: Record<string, number>): string {
  if (/<w:updateFields\b/.test(settingsXml)) {
    if (/<w:updateFields\b[^>]*w:val="true"/.test(settingsXml)) return settingsXml;
    changes.updateFieldsEnabled += 1;
    return settingsXml.replace(/<w:updateFields\b[^/>]*\/>/, '<w:updateFields w:val="true"/>');
  }
  changes.updateFieldsEnabled += 1;
  return settingsXml.replace("</w:settings>", '<w:updateFields w:val="true"/></w:settings>');
}

function runPropertiesFromRun(runXml: string): string {
  return runXml.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
}

function textRun(text: string, rPr = ""): string {
  if (text.length === 0) return "";
  const preserve = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : "";
  return `<w:r>${rPr}<w:t${preserve}>${xmlEscape(text)}</w:t></w:r>`;
}

function fieldRuns(bookmarkName: string, displayText: string, rPr = ""): string {
  return [
    `<w:r>${rPr}<w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r>`,
    `<w:r>${rPr}<w:instrText xml:space="preserve"> REF ${bookmarkName} \\h \\* CHARFORMAT </w:instrText></w:r>`,
    `<w:r>${rPr}<w:fldChar w:fldCharType="separate"/></w:r>`,
    textRun(displayText, rPr),
    `<w:r>${rPr}<w:fldChar w:fldCharType="end"/></w:r>`,
  ].join("");
}

function maxBookmarkId(documentXml: string): number {
  let max = 0;
  for (const match of documentXml.matchAll(/<w:bookmarkStart\b[^>]*w:id="([0-9]+)"/g)) {
    max = Math.max(max, Number(match[1]));
  }
  return max;
}

function addBookmarkToCaption(paragraph: string, label: string, id: number): { xml: string; added: boolean } {
  const bookmarkName = labelBookmarkName(label);
  if (paragraph.includes(`w:name="${bookmarkName}"`)) return { xml: paragraph, added: false };

  const kind = label.startsWith("表") ? "表" : "图";
  const number = label.replace(/^[图表]/, "").replace(/-/g, "[-－]");
  const labelRe = new RegExp(`${kind}\\s*${number}`);

  const updated = paragraph.replace(/<w:r\b[\s\S]*?<\/w:r>/, (run) => {
    const textMatch = run.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/);
    if (!textMatch) return run;
    const text = xmlUnescape(textMatch[1] ?? "");
    const match = text.match(labelRe);
    if (!match || match.index === undefined) return run;

    const before = text.slice(0, match.index);
    const actual = match[0];
    const after = text.slice(match.index + actual.length);
    const rPr = runPropertiesFromRun(run);
    return [
      textRun(before, rPr),
      `<w:bookmarkStart w:id="${id}" w:name="${bookmarkName}"/>`,
      textRun(normalizeLabel(kind, actual.replace(kind, "")), rPr),
      `<w:bookmarkEnd w:id="${id}"/>`,
      textRun(after, rPr),
    ].join("");
  });

  return { xml: updated, added: updated !== paragraph };
}

function patchCrossReferences(documentXml: string, changes: Record<string, number>, warnings: string[]): string {
  const captions = new Map<string, string>();
  for (const paragraph of documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)) {
    const label = captionLabelFromText(extractText(paragraph[0]));
    if (label) captions.set(label, labelBookmarkName(label));
  }
  if (captions.size === 0) {
    warnings.push("No figure/table captions were found for cross-reference repair.");
    return documentXml;
  }

  let nextBookmarkId = maxBookmarkId(documentXml) + 1;
  let xml = documentXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
    const label = captionLabelFromText(extractText(paragraph));
    if (!label || !captions.has(label)) return paragraph;
    const result = addBookmarkToCaption(paragraph, label, nextBookmarkId);
    if (result.added) {
      nextBookmarkId += 1;
      changes.captionBookmarksAdded += 1;
    }
    return result.xml;
  });

  xml = xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
    const text = extractText(paragraph);
    if (captionLabelFromText(text)) return paragraph;
    if (/<w:(fldChar|instrText|drawing|bookmarkStart|hyperlink)\b/.test(paragraph)) return paragraph;

    const matches = Array.from(text.matchAll(/([图表])\s*([0-9]+[-－][0-9]+)/g))
      .filter((match) => captions.has(normalizeLabel(match[1], match[2])));
    if (matches.length === 0) return paragraph;

    const pPr = paragraph.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
    const runMatches = Array.from(paragraph.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g)).map((match) => match[0]);
    if (runMatches.length === 0) return paragraph;

    let rebuilt = pPr;
    for (const run of runMatches) {
      const runText = extractText(run);
      if (!runText) {
        rebuilt += run;
        continue;
      }
      const rPr = runPropertiesFromRun(run);
      let cursor = 0;
      for (const match of runText.matchAll(/([图表])\s*([0-9]+[-－][0-9]+)/g)) {
        if (match.index === undefined) continue;
        const label = normalizeLabel(match[1], match[2]);
        const bookmarkName = captions.get(label);
        if (!bookmarkName) continue;
        rebuilt += textRun(runText.slice(cursor, match.index), rPr);
        rebuilt += fieldRuns(bookmarkName, label, rPr);
        changes.bodyReferencesConverted += 1;
        cursor = match.index + match[0].length;
      }
      rebuilt += textRun(runText.slice(cursor), rPr);
    }
    return `<w:p>${rebuilt}</w:p>`;
  });

  return xml;
}

function outputPathForInput(): string {
  if (values.output) return resolve(values.output);
  if (values["in-place"]) return inputPath;
  const dir = dirname(inputPath);
  const ext = extname(inputPath);
  const stem = basename(inputPath, ext);
  return join(dir, `${stem}-repaired${ext}`);
}

function createBackupIfNeeded(): string | undefined {
  if (!values["in-place"] || scanOnly) return undefined;
  const backupDir = values["backup-dir"]
    ? resolve(values["backup-dir"])
    : join(dirname(inputPath), "_archive", "docx_backups");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `${basename(inputPath, ".docx")}-before-docx-repair-${stamp}.docx`);
  copyFileSync(inputPath, backupPath);
  return backupPath;
}

async function main() {
  const zip = await JSZip.loadAsync(readFileSync(inputPath));
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw new Error("word/document.xml not found");
  }

  let documentXml = await documentFile.async("string");
  const stylesFile = zip.file("word/styles.xml");
  const settingsFile = zip.file("word/settings.xml");
  let stylesXml = stylesFile ? await stylesFile.async("string") : "";
  let settingsXml = settingsFile ? await settingsFile.async("string") : "";

  const changes = {
    tableIndentsRemoved: 0,
    refCharformatAdded: 0,
    tocStylesNormalized: 0,
    tocParagraphLevelsNormalized: 0,
    updateFieldsEnabled: 0,
    captionBookmarksAdded: 0,
    bodyReferencesConverted: 0,
  };
  const warnings: string[] = [];

  const statsBefore = collectStats(documentXml);
  const report: RepairReport = {
    input: inputPath,
    scanOnly,
    options: { ...options, output: values.output, inPlace: Boolean(values["in-place"]) },
    statsBefore,
    changes,
    warnings,
  };

  if (!scanOnly) {
    const backupPath = createBackupIfNeeded();
    if (backupPath) warnings.push(`Backup created: ${backupPath}`);

    if (options.fixTableIndents) documentXml = patchTableIndents(documentXml, changes);
    if (options.fixRefCharformat) documentXml = patchRefCharformat(documentXml, changes);
    if (options.fixTocStyles) {
      if (stylesXml) stylesXml = patchTocStyles(stylesXml, changes);
      documentXml = patchTocResultParagraphs(documentXml, changes);
    }
    if (options.fixCrossrefs) documentXml = patchCrossReferences(documentXml, changes, warnings);
    if (options.fixUpdateFields) {
      if (settingsXml) settingsXml = patchUpdateFields(settingsXml, changes);
      else warnings.push("word/settings.xml not found; updateFields was not changed.");
    }

    zip.file("word/document.xml", documentXml);
    if (stylesFile) zip.file("word/styles.xml", stylesXml);
    if (settingsFile) zip.file("word/settings.xml", settingsXml);

    const outputPath = outputPathForInput();
    const outputDir = dirname(outputPath);
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(outputPath, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
    report.output = outputPath;

    const outputZip = await JSZip.loadAsync(readFileSync(outputPath));
    const outputDocument = await outputZip.file("word/document.xml")?.async("string");
    if (!outputDocument) throw new Error("repaired DOCX is missing word/document.xml");
    report.statsAfter = collectStats(outputDocument);
  }

  const reportJson = JSON.stringify(report, null, 2);
  if (values.report) {
    const reportPath = resolve(values.report);
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, reportJson, "utf8");
  }
  console.log(reportJson);
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
