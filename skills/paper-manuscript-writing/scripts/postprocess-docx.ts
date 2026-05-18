#!/usr/bin/env npx tsx
/**
 * postprocess-docx.ts — generic Chinese thesis DOCX post-processor.
 *
 * Pandoc is good at conversion but weak at school-thesis defaults unless a
 * precise reference DOCX is available. This script applies a conservative
 * fallback style layer directly to the generated DOCX package:
 *   - Chinese/English fonts and thesis-sized headings
 *   - A4 page margins and Word field auto-update
 *   - three-line-table style borders
 *
 * School templates still win: use export.ts --reference-doc or project
 * format/reference.docx when an official template is available.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import JSZip from "jszip";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: "boolean", short: "h" },
    "no-table-borders": { type: "boolean" },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`Usage: npx tsx scripts/postprocess-docx.ts <output.docx> [options]

Options:
  --no-table-borders  Do not rewrite table borders
  -h, --help          Show help`);
  process.exit(0);
}

const docxPath = resolve(positionals[0]);
if (!existsSync(docxPath)) {
  console.error(`Error: DOCX not found: ${docxPath}`);
  process.exit(1);
}

function replaceOrInsertStyle(stylesXml: string, styleId: string, styleXml: string): string {
  const escaped = styleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<w:style\\b[^>]*w:styleId="${escaped}"[^>]*>[\\s\\S]*?<\\/w:style>`);
  if (re.test(stylesXml)) {
    return stylesXml.replace(re, styleXml);
  }
  return stylesXml.replace("</w:styles>", `${styleXml}\n</w:styles>`);
}

function styleXml(styleId: string, name: string, pPr: string, rPr: string, attrs = ""): string {
  return `<w:style w:type="paragraph" w:styleId="${styleId}"${attrs}>
  <w:name w:val="${name}"/>
  ${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}
  ${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}
</w:style>`;
}

function runFonts(cn: string, en = "Times New Roman"): string {
  return `<w:rFonts w:ascii="${en}" w:hAnsi="${en}" w:eastAsia="${cn}" w:cs="${en}"/>`;
}

function size(halfPoints: number): string {
  return `<w:sz w:val="${halfPoints}"/><w:szCs w:val="${halfPoints}"/>`;
}

function patchStyles(stylesXml: string): string {
  let xml = stylesXml;

  xml = replaceOrInsertStyle(
    xml,
    "Normal",
    styleXml(
      "Normal",
      "Normal",
      '<w:spacing w:line="360" w:lineRule="auto"/><w:ind w:firstLine="480"/>',
      `${runFonts("宋体")}${size(24)}`,
      ' w:default="1"'
    )
  );

  xml = replaceOrInsertStyle(
    xml,
    "Title",
    styleXml(
      "Title",
      "Title",
      '<w:jc w:val="center"/><w:spacing w:before="240" w:after="240"/>',
      `${runFonts("黑体")}<w:b/>${size(36)}`
    )
  );

  xml = replaceOrInsertStyle(
    xml,
    "Heading1",
    styleXml(
      "Heading1",
      "heading 1",
      '<w:keepNext/><w:pageBreakBefore/><w:spacing w:before="360" w:after="240"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/>',
      `${runFonts("黑体")}<w:b/>${size(32)}`
    )
  );

  xml = replaceOrInsertStyle(
    xml,
    "Heading2",
    styleXml(
      "Heading2",
      "heading 2",
      '<w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/>',
      `${runFonts("黑体")}<w:b/>${size(28)}`
    )
  );

  xml = replaceOrInsertStyle(
    xml,
    "Heading3",
    styleXml(
      "Heading3",
      "heading 3",
      '<w:keepNext/><w:spacing w:before="180" w:after="90"/><w:outlineLvl w:val="2"/>',
      `${runFonts("黑体")}<w:b/>${size(24)}`
    )
  );

  xml = replaceOrInsertStyle(
    xml,
    "Caption",
    styleXml(
      "Caption",
      "caption",
      '<w:jc w:val="center"/><w:spacing w:before="60" w:after="120"/>',
      `${runFonts("宋体")}${size(21)}`
    )
  );

  xml = replaceOrInsertStyle(
    xml,
    "BodyText",
    styleXml(
      "BodyText",
      "Body Text",
      '<w:spacing w:line="360" w:lineRule="auto"/><w:ind w:firstLine="480"/>',
      `${runFonts("宋体")}${size(24)}`
    )
  );

  return xml;
}

function patchSettings(settingsXml: string): string {
  if (/<w:updateFields\b/.test(settingsXml)) {
    return settingsXml.replace(/<w:updateFields\b[^/>]*\/>/, '<w:updateFields w:val="true"/>');
  }
  return settingsXml.replace("</w:settings>", '<w:updateFields w:val="true"/></w:settings>');
}

function patchDocument(documentXml: string, rewriteTableBorders: boolean): string {
  let xml = documentXml;

  const margins = '<w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="720" w:footer="720" w:gutter="0"/>';
  xml = xml.replace(/<w:pgMar\b[^>]*\/>/g, margins);

  if (rewriteTableBorders) {
    const borders = [
      '<w:tblBorders>',
      '<w:top w:val="single" w:sz="12" w:space="0" w:color="000000"/>',
      '<w:left w:val="nil"/>',
      '<w:bottom w:val="single" w:sz="12" w:space="0" w:color="000000"/>',
      '<w:right w:val="nil"/>',
      '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>',
      '<w:insideV w:val="nil"/>',
      '</w:tblBorders>',
    ].join("");

    xml = xml.replace(/<w:tblPr>([\s\S]*?)<\/w:tblPr>/g, (_match, inner) => {
      const cleaned = inner.replace(/<w:tblBorders>[\s\S]*?<\/w:tblBorders>/g, "");
      return `<w:tblPr>${cleaned}${borders}</w:tblPr>`;
    });
  }

  return xml;
}

async function main() {
  const zip = await JSZip.loadAsync(readFileSync(docxPath));

  const stylesFile = zip.file("word/styles.xml");
  if (stylesFile) {
    const stylesXml = await stylesFile.async("string");
    zip.file("word/styles.xml", patchStyles(stylesXml));
  }

  const settingsFile = zip.file("word/settings.xml");
  if (settingsFile) {
    const settingsXml = await settingsFile.async("string");
    zip.file("word/settings.xml", patchSettings(settingsXml));
  }

  const documentFile = zip.file("word/document.xml");
  if (documentFile) {
    const documentXml = await documentFile.async("string");
    zip.file("word/document.xml", patchDocument(documentXml, !values["no-table-borders"]));
  }

  const output = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  writeFileSync(docxPath, output);
  console.log(`Post-processed DOCX: ${docxPath}`);
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
