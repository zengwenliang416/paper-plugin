#!/usr/bin/env npx tsx
/**
 * parse-template.ts — Extract format parameters from a Chinese university
 * thesis Word document (.docx/.doc) and generate format-config.json + reference.docx.
 *
 * Usage:
 *   npx tsx scripts/parse-template.ts <input.docx|.doc> --output-dir <dir>
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { resolve, extname, basename, dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { ensureDeps } from "./check-deps.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface PageSize {
  width: number;
  height: number;
}

interface StyleDef {
  fontCN?: string;
  fontEN?: string;
  sizePt?: number;
  lineSpacing?: number;
  lineSpacingRule?: string;
  alignment?: string;
  spaceBefore?: number;
  spaceAfter?: number;
  bold?: boolean;
}

interface FormatConfig {
  pageMargins: PageMargins;
  pageSize: PageSize;
  styles: Record<string, StyleDef>;
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseCliArgs(): { input: string; outputDir: string; mode: "auto" | "style" | "text" } {
  const args = process.argv.slice(2);
  let input = "";
  let outputDir = "";
  let mode: "auto" | "style" | "text" = "auto";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output-dir" && i + 1 < args.length) {
      outputDir = args[++i];
    } else if (args[i] === "--mode" && i + 1 < args.length) {
      const v = args[++i];
      if (v === "style" || v === "text" || v === "auto") mode = v;
      else { console.error(`Unknown mode: ${v}. Use: auto, style, text`); process.exit(1); }
    } else if (!args[i].startsWith("-")) {
      input = args[i];
    }
  }

  if (!input || !outputDir) {
    console.error(`Usage: npx tsx scripts/parse-template.ts <input.docx|.doc> --output-dir <dir> [--mode auto|style|text]

Modes:
  auto   (default) Try text parsing first; fall back to style extraction
  style  Extract format from DOCX XML styles (for formatted thesis documents)
  text   Parse format requirements from document text content (for school specification documents)`);
    process.exit(1);
  }

  return { input: resolve(input), outputDir: resolve(outputDir), mode };
}

// ---------------------------------------------------------------------------
// Twips / EMU conversions
// ---------------------------------------------------------------------------

/** Convert twips to centimeters (1 cm = 567 twips) */
function twipsToCm(twips: number): number {
  return Math.round((twips / 567) * 100) / 100;
}

// ---------------------------------------------------------------------------
// .doc -> .docx conversion
// ---------------------------------------------------------------------------

function convertDocToDocx(docPath: string, outDir: string): string {
  console.log("[1/4] Converting .doc to .docx via LibreOffice ...");
  execSync(`soffice --headless --convert-to docx "${docPath}" --outdir "${outDir}"`, {
    encoding: "utf-8",
    timeout: 60_000,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const docxName = basename(docPath).replace(/\.doc$/i, ".docx");
  const docxPath = join(outDir, docxName);
  if (!existsSync(docxPath)) {
    console.error(`Conversion failed: expected ${docxPath} not found.`);
    process.exit(1);
  }
  return docxPath;
}

// ---------------------------------------------------------------------------
// XML extraction helpers (regex-based, no DOM parser)
// ---------------------------------------------------------------------------

function attrVal(xml: string, attr: string): string | undefined {
  // Match w:attr="value" or attr="value"
  const re = new RegExp(`(?:w:)?${attr}="([^"]*)"`, "i");
  const m = xml.match(re);
  return m?.[1];
}

function extractPageMargins(documentXml: string): PageMargins {
  const pgMarMatch = documentXml.match(/<w:pgMar[^/>]*\/>/s);
  if (!pgMarMatch) {
    console.warn("  Warning: <w:pgMar> not found, using A4 defaults.");
    return { top: 2.54, bottom: 2.54, left: 3.17, right: 3.17 };
  }
  const tag = pgMarMatch[0];
  return {
    top: twipsToCm(Number(attrVal(tag, "top") ?? 1440)),
    bottom: twipsToCm(Number(attrVal(tag, "bottom") ?? 1440)),
    left: twipsToCm(Number(attrVal(tag, "left") ?? 1800)),
    right: twipsToCm(Number(attrVal(tag, "right") ?? 1800)),
  };
}

function extractPageSize(documentXml: string): PageSize {
  const pgSzMatch = documentXml.match(/<w:pgSz[^/>]*\/>/s);
  if (!pgSzMatch) {
    console.warn("  Warning: <w:pgSz> not found, using A4 defaults.");
    return { width: 21.0, height: 29.7 };
  }
  const tag = pgSzMatch[0];
  return {
    width: twipsToCm(Number(attrVal(tag, "w") ?? 11906)),
    height: twipsToCm(Number(attrVal(tag, "h") ?? 16838)),
  };
}

/**
 * Extract all <w:style> blocks from styles.xml.
 * Returns a map: styleId -> raw XML string of that <w:style ...>...</w:style>.
 */
function extractStyleBlocks(stylesXml: string): Map<string, string> {
  const map = new Map<string, string>();
  // Non-greedy match of each w:style element.  The style block may contain
  // nested elements so we need to handle the closing tag carefully.
  const re = /<w:style\s[^>]*?w:styleId="([^"]*)"[^>]*>([\s\S]*?)<\/w:style>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stylesXml)) !== null) {
    map.set(m[1], m[0]);
  }
  return map;
}

function parseStyleBlock(block: string): StyleDef {
  const style: StyleDef = {};

  // Font family
  const rFontsMatch = block.match(/<w:rFonts[^/>]*\/?>/s);
  if (rFontsMatch) {
    const tag = rFontsMatch[0];
    style.fontCN = attrVal(tag, "eastAsia");
    style.fontEN = attrVal(tag, "ascii");
  }

  // Font size: <w:sz w:val="..."/>  (half-points)
  const szMatch = block.match(/<w:sz\s+w:val="(\d+)"/);
  if (szMatch) {
    style.sizePt = Number(szMatch[1]) / 2;
  }

  // Line spacing: <w:spacing w:line="..." w:lineRule="..."/>
  const spacingMatch = block.match(/<w:spacing[^/>]*\/?>/gs);
  if (spacingMatch) {
    // Use the last <w:spacing> found in rPr/pPr context
    for (const sp of spacingMatch) {
      const lineVal = attrVal(sp, "line");
      if (lineVal) {
        style.lineSpacing = Number(lineVal);
        style.lineSpacingRule = attrVal(sp, "lineRule") ?? "auto";
      }
      const before = attrVal(sp, "before");
      if (before) style.spaceBefore = Number(before);
      const after = attrVal(sp, "after");
      if (after) style.spaceAfter = Number(after);
    }
  }

  // Alignment: <w:jc w:val="center"/>
  const jcMatch = block.match(/<w:jc\s+w:val="([^"]*)"/);
  if (jcMatch) {
    style.alignment = jcMatch[1];
  }

  // Bold: <w:b/> or <w:b w:val="true"/> or <w:b w:val="1"/>
  if (/<w:b\s*\/?>/.test(block) || /<w:b\s+w:val="(true|1)"/.test(block)) {
    // Make sure it's not <w:bCs> only
    if (/<w:b[\s/>]/.test(block)) {
      style.bold = true;
    }
  }

  return style;
}

// ---------------------------------------------------------------------------
// Step 2: parse DOCX
// ---------------------------------------------------------------------------

async function parseDocx(docxPath: string): Promise<FormatConfig> {
  console.log("[2/4] Parsing DOCX XML ...");
  const buf = readFileSync(docxPath);
  const zip = await JSZip.loadAsync(buf);

  // document.xml
  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    console.error("  Error: word/document.xml not found in DOCX.");
    process.exit(1);
  }
  const documentXml = await docXmlFile.async("string");

  const pageMargins = extractPageMargins(documentXml);
  const pageSize = extractPageSize(documentXml);
  console.log(`  Page: ${pageSize.width} x ${pageSize.height} cm`);
  console.log(`  Margins: top=${pageMargins.top}, bottom=${pageMargins.bottom}, left=${pageMargins.left}, right=${pageMargins.right} cm`);

  // styles.xml
  const stylesXmlFile = zip.file("word/styles.xml");
  if (!stylesXmlFile) {
    console.error("  Error: word/styles.xml not found in DOCX.");
    process.exit(1);
  }
  const stylesXml = await stylesXmlFile.async("string");
  const styleBlocks = extractStyleBlocks(stylesXml);

  // Resolve style with basedOn inheritance chain
  function resolveStyle(styleId: string, visited = new Set<string>()): StyleDef {
    if (visited.has(styleId)) return {};
    visited.add(styleId);

    const block = styleBlocks.get(styleId);
    if (!block) return {};

    // Check for basedOn parent
    const basedOnMatch = block.match(/<w:basedOn\s+w:val="([^"]*)"/);
    let parent: StyleDef = {};
    if (basedOnMatch) {
      parent = resolveStyle(basedOnMatch[1], visited);
    }

    const self = parseStyleBlock(block);

    // Merge: self overrides parent
    return {
      fontCN: self.fontCN ?? parent.fontCN,
      fontEN: self.fontEN ?? parent.fontEN,
      sizePt: self.sizePt ?? parent.sizePt,
      lineSpacing: self.lineSpacing ?? parent.lineSpacing,
      lineSpacingRule: self.lineSpacingRule ?? parent.lineSpacingRule,
      alignment: self.alignment ?? parent.alignment,
      spaceBefore: self.spaceBefore ?? parent.spaceBefore,
      spaceAfter: self.spaceAfter ?? parent.spaceAfter,
      bold: self.bold ?? parent.bold,
    };
  }

  const styles: Record<string, StyleDef> = {};

  // Normal style (styleId may be "Normal" or "a" in some CJK templates)
  const normalId = styleBlocks.has("Normal") ? "Normal" : (styleBlocks.has("a") ? "a" : undefined);
  if (normalId) {
    const s = resolveStyle(normalId);
    styles.normal = {
      fontCN: s.fontCN?.split(";")[0],
      fontEN: s.fontEN,
      sizePt: s.sizePt,
      lineSpacing: s.lineSpacing,
      lineSpacingRule: s.lineSpacingRule,
    };
    console.log(`  Normal: ${styles.normal.fontCN ?? "?"} / ${styles.normal.fontEN ?? "?"}, ${styles.normal.sizePt ?? "?"}pt`);
  } else {
    console.warn("  Warning: Normal style not found.");
  }

  // Heading 1-4 (styleId patterns: "Heading1", "1", "heading1", etc.)
  for (let level = 1; level <= 4; level++) {
    const candidates = [`Heading${level}`, `heading ${level}`, `${level}`, `Heading ${level}`];
    let foundId: string | undefined;
    for (const cand of candidates) {
      if (styleBlocks.has(cand)) { foundId = cand; break; }
    }
    // Fallback: search by w:name="heading N"
    if (!foundId) {
      for (const [id, b] of styleBlocks) {
        if (new RegExp(`w:name="heading\\s*${level}"`, "i").test(b)) {
          foundId = id;
          break;
        }
      }
    }
    const key = `heading${level}`;
    if (foundId) {
      const s = resolveStyle(foundId);
      styles[key] = {
        fontCN: s.fontCN?.split(";")[0],
        fontEN: s.fontEN?.split(";")[0],
        sizePt: s.sizePt,
        alignment: s.alignment,
        spaceBefore: s.spaceBefore,
        spaceAfter: s.spaceAfter,
        bold: s.bold,
      };
      console.log(`  Heading ${level}: ${styles[key].fontCN ?? "?"} / ${styles[key].fontEN ?? "?"}, ${s.sizePt ?? "?"}pt, bold=${s.bold ?? false}`);
    } else {
      console.warn(`  Warning: Heading ${level} style not found.`);
    }
  }

  // Clean up undefined values
  for (const key of Object.keys(styles)) {
    const obj = styles[key];
    for (const k of Object.keys(obj) as (keyof StyleDef)[]) {
      if (obj[k] === undefined) delete obj[k];
    }
  }

  return { pageMargins, pageSize, styles };
}

// ---------------------------------------------------------------------------
// Step 2b: Parse format requirements from document TEXT content
// For school specification documents that describe formatting rules in prose
// ---------------------------------------------------------------------------

const SIZE_NAME_TO_PT: Record<string, number> = {
  "初号": 42, "小初": 36, "一号": 26, "小一": 24,
  "二号": 22, "小二": 18, "三号": 16, "小三": 15,
  "四号": 14, "小���": 12, "五号": 10.5, "小五": 9,
  "六号": 7.5, "小六": 6.5, "七号": 5.5, "八号": 5,
};

function sizeNameToPt(name: string): number | undefined {
  return SIZE_NAME_TO_PT[name.trim()];
}

async function parseDocxText(docxPath: string): Promise<FormatConfig | null> {
  console.log("[2/4] Parsing format requirements from document text ...");
  const buf = readFileSync(docxPath);
  const zip = await JSZip.loadAsync(buf);
  const docXml = await zip.file("word/document.xml")?.async("text");
  if (!docXml) return null;

  // Extract plain text from document XML
  const text = docXml
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  // Check if this looks like a format specification document
  const formatKeywords = ["页边距", "字体", "字号", "行距", "行间距", "正文", "标题", "宋体", "黑体", "Times"];
  const hits = formatKeywords.filter((kw) => text.includes(kw)).length;
  if (hits < 3) {
    console.log("  Document does not appear to be a format specification (too few format keywords).");
    return null;
  }
  console.log(`  Detected format specification document (${hits} format keywords found)`);

  const config: FormatConfig = {
    pageMargins: { top: 2.54, bottom: 2.54, left: 3.17, right: 3.17 },
    pageSize: { width: 21.0, height: 29.7 },
    styles: {},
  };

  // --- Page margins ---
  // Patterns: "页边距：上2.54cm，下2.54cm，左3.17cm，右3.17cm"
  //           "上边距2.54cm" "左边距3.17cm"
  const marginPatterns: [keyof PageMargins, RegExp[]][] = [
    ["top", [/上[边距：:\s]*(\d+\.?\d*)\s*cm/i, /top[:\s]*(\d+\.?\d*)\s*cm/i]],
    ["bottom", [/下[边��：:\s]*(\d+\.?\d*)\s*cm/i, /bottom[:\s]*(\d+\.?\d*)\s*cm/i]],
    ["left", [/左[边距：:\s]*(\d+\.?\d*)\s*cm/i, /left[:\s]*(\d+\.?\d*)\s*cm/i]],
    ["right", [/右[边距：:\s]*(\d+\.?\d*)\s*cm/i, /right[:\s]*(\d+\.?\d*)\s*cm/i]],
  ];
  for (const [key, patterns] of marginPatterns) {
    for (const re of patterns) {
      const m = text.match(re);
      if (m) { config.pageMargins[key] = parseFloat(m[1]); break; }
    }
  }
  console.log(`  Margins: top=${config.pageMargins.top}, bottom=${config.pageMargins.bottom}, left=${config.pageMargins.left}, right=${config.pageMargins.right} cm`);

  // --- Body text style ---
  // "正文：宋体小四号" "正文采用小四，中文宋体" "正文用宋体，小四号，1.5��行距"
  const bodyFontCN = text.match(/正文[^。]*?(宋体|仿宋|楷体|黑体)/)?.[1];
  const bodyFontEN = text.match(/正文[^。]*?(Times\s*New\s*Roman|Arial|Calibri)/i)?.[1];
  const bodySizeName = text.match(/正文[^。]*?(初号|小初|一号|小一|二号|小二|三号|小三|四号|小四|五号|小五|六号)/)?.[1];
  const bodyLineSpacing = text.match(/正文[^。]*?(\d+\.?\d*)\s*倍行距/)?.[1]
    ?? text.match(/行[间距]*[：:\s]*(\d+\.?\d*)\s*倍/)?.[1];

  config.styles.normal = {
    fontCN: bodyFontCN ?? "宋体",
    fontEN: bodyFontEN ?? "Times New Roman",
    sizePt: bodySizeName ? sizeNameToPt(bodySizeName) : 12,
  };
  if (bodyLineSpacing) {
    config.styles.normal.lineSpacing = Math.round(parseFloat(bodyLineSpacing) * 240);
    config.styles.normal.lineSpacingRule = "auto";
  }
  console.log(`  Normal: ${config.styles.normal.fontCN} / ${config.styles.normal.fontEN}, ${config.styles.normal.sizePt}pt`);

  // --- Heading styles ---
  // "一级标题：黑体三号，居中" "章标题采用三号黑体" "节标题：黑体小三号"
  const headingPatterns: [string, RegExp[]][] = [
    ["heading1", [
      /(?:一级标题|章标题)[^。]*?(黑体|宋体)[^。]*?(初号|小初|一号|小���|二号|小二|三号|小三|四号|小四|五号)/,
      /(?:一级标题|章标题)[^。]*?(初号|小初|一号|小一|二号|��二|���号|小三|四号|小四|五号)[^。]*?(黑体|宋体)/,
    ]],
    ["heading2", [
      /(?:二级标题|节标题)[^。]*?(黑体|宋��)[^。]*?(初号|小初|一号|小一|二号|小二|三号|小三|四号|��四|五号)/,
      /(?:二级标题|��标题)[^。]*?(��号|小初|一号|小一|二号|小二|三号|小三|四号|小四|五号)[^。]*?(黑体|宋体)/,
    ]],
    ["heading3", [
      /(?:三级标题|小节标题)[^。]*?(黑体|宋体)[^。]*?(初号|��初|一号|小一|二号|小二|三号|小三|四号|小四|五号)/,
      /(?:三级标题|小节标题)[^。]*?(初��|小初|一号|小一|二号|小二|三号|小三|四号|小四|五号)[^。]*?(黑体|宋体)/,
    ]],
  ];

  for (const [key, patterns] of headingPatterns) {
    for (const re of patterns) {
      const m = text.match(re);
      if (m) {
        const [fontOrSize1, fontOrSize2] = [m[1], m[2]];
        const font = SIZE_NAME_TO_PT[fontOrSize1] ? fontOrSize2 : fontOrSize1;
        const sizeName = SIZE_NAME_TO_PT[fontOrSize1] ? fontOrSize1 : fontOrSize2;
        const alignment = /居中/.test(text.match(new RegExp(`${key === "heading1" ? "一级标题|章标题" : key === "heading2" ? "二级标题|节标题" : "三���标题|小节标题"}[^。]*`))?.[0] ?? "") ? "center" : undefined;

        config.styles[key] = {
          fontCN: font ?? "���体",
          fontEN: "Times New Roman",
          sizePt: sizeNameToPt(sizeName),
          bold: true,
          alignment,
        };
        console.log(`  ${key}: ${config.styles[key].fontCN}, ${config.styles[key].sizePt}pt${alignment ? ", center" : ""}`);
        break;
      }
    }
  }

  return config;
}

// ---------------------------------------------------------------------------
// Step 3: write format-config.json
// ---------------------------------------------------------------------------

function writeFormatConfig(config: FormatConfig, outputDir: string): string {
  console.log("[3/4] Writing format-config.json ...");
  mkdirSync(outputDir, { recursive: true });
  const outPath = join(outputDir, "format-config.json");
  writeFileSync(outPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
  console.log(`  -> ${outPath}`);
  return outPath;
}

// ---------------------------------------------------------------------------
// Step 4: generate reference.docx
// ---------------------------------------------------------------------------

function buildRFontsTag(fontCN?: string, fontEN?: string): string {
  const east = fontCN ?? "宋体";
  const ascii = fontEN ?? "Times New Roman";
  return `<w:rFonts w:ascii="${ascii}" w:hAnsi="${ascii}" w:eastAsia="${east}" w:cs="${ascii}"/>`;
}

function buildSzTag(sizePt?: number): string {
  if (!sizePt) return "";
  const halfPt = sizePt * 2;
  return `<w:sz w:val="${halfPt}"/><w:szCs w:val="${halfPt}"/>`;
}

function replaceStyleInXml(
  stylesXml: string,
  styleId: string,
  styleName: string,
  def: StyleDef
): string {
  // Find the <w:style> block with this styleId
  const re = new RegExp(
    `(<w:style\\s[^>]*?w:styleId="${styleId}"[^>]*>)([\\s\\S]*?)(</w:style>)`,
    "g"
  );
  return stylesXml.replace(re, (_match, openTag: string, body: string, closeTag: string) => {
    // Replace rFonts inside <w:rPr>
    if (def.fontCN || def.fontEN) {
      if (/<w:rFonts[^/>]*\/?>/.test(body)) {
        body = body.replace(/<w:rFonts[^/>]*\/?>/g, buildRFontsTag(def.fontCN, def.fontEN));
      } else {
        // Insert rFonts into rPr if rPr exists
        body = body.replace(/<w:rPr>/, `<w:rPr>${buildRFontsTag(def.fontCN, def.fontEN)}`);
      }
    }

    // Replace sz
    if (def.sizePt) {
      if (/<w:sz\s/.test(body)) {
        body = body.replace(/<w:sz\s+w:val="\d+"\/>/g, `<w:sz w:val="${def.sizePt * 2}"/>`);
        body = body.replace(/<w:szCs\s+w:val="\d+"\/>/g, `<w:szCs w:val="${def.sizePt * 2}"/>`);
      } else {
        body = body.replace(/<w:rPr>/, `<w:rPr>${buildSzTag(def.sizePt)}`);
      }
    }

    // Replace bold
    if (def.bold === true) {
      if (!/<w:b[\s/>]/.test(body)) {
        body = body.replace(/<w:rPr>/, `<w:rPr><w:b/>`);
      }
    }

    // Replace alignment
    if (def.alignment) {
      if (/<w:jc\s/.test(body)) {
        body = body.replace(/<w:jc\s+w:val="[^"]*"\/>/g, `<w:jc w:val="${def.alignment}"/>`);
      } else {
        // Insert into pPr
        if (/<w:pPr>/.test(body)) {
          body = body.replace(/<w:pPr>/, `<w:pPr><w:jc w:val="${def.alignment}"/>`);
        } else {
          // Create pPr
          body = `<w:pPr><w:jc w:val="${def.alignment}"/></w:pPr>` + body;
        }
      }
    }

    // Replace spacing (line, before, after)
    const spacingAttrs: string[] = [];
    if (def.lineSpacing) spacingAttrs.push(`w:line="${def.lineSpacing}" w:lineRule="${def.lineSpacingRule ?? "auto"}"`);
    if (def.spaceBefore !== undefined) spacingAttrs.push(`w:before="${def.spaceBefore}"`);
    if (def.spaceAfter !== undefined) spacingAttrs.push(`w:after="${def.spaceAfter}"`);

    if (spacingAttrs.length > 0) {
      const spacingTag = `<w:spacing ${spacingAttrs.join(" ")}/>`;
      if (/<w:spacing[^/>]*\/?>/.test(body)) {
        body = body.replace(/<w:spacing[^/>]*\/?>/g, spacingTag);
      } else if (/<w:pPr>/.test(body)) {
        body = body.replace(/<w:pPr>/, `<w:pPr>${spacingTag}`);
      } else {
        body = `<w:pPr>${spacingTag}</w:pPr>` + body;
      }
    }

    return openTag + body + closeTag;
  });
}

function replaceMarginsInDocXml(documentXml: string, margins: PageMargins): string {
  const top = Math.round(margins.top * 567);
  const bottom = Math.round(margins.bottom * 567);
  const left = Math.round(margins.left * 567);
  const right = Math.round(margins.right * 567);

  const newTag = `<w:pgMar w:top="${top}" w:right="${right}" w:bottom="${bottom}" w:left="${left}" w:header="851" w:footer="992" w:gutter="0"/>`;

  if (/<w:pgMar[^/>]*\/>/.test(documentXml)) {
    return documentXml.replace(/<w:pgMar[^/>]*\/>/, newTag);
  }
  // If pgMar not found, inject before </w:sectPr>
  return documentXml.replace(/<\/w:sectPr>/, newTag + "</w:sectPr>");
}

async function generateReferenceDox(config: FormatConfig, outputDir: string): Promise<void> {
  console.log("[4/4] Generating reference.docx ...");

  // Generate minimal docx with pandoc
  const tmpDocx = join(outputDir, "_min_tmp.docx");
  try {
    execSync(`echo " " | pandoc -o "${tmpDocx}"`, {
      encoding: "utf-8",
      timeout: 30_000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (e) {
    console.error("  Error: pandoc failed to generate minimal docx. Is pandoc installed?");
    process.exit(1);
  }

  const buf = readFileSync(tmpDocx);
  const zip = await JSZip.loadAsync(buf);

  // Patch styles.xml
  const stylesFile = zip.file("word/styles.xml");
  if (!stylesFile) {
    console.error("  Error: word/styles.xml not found in pandoc-generated docx.");
    process.exit(1);
  }
  let stylesXml = await stylesFile.async("string");

  // Style mappings: pandoc uses styleId like "Normal", "Heading1", etc.
  const styleMap: [string, string, StyleDef | undefined][] = [
    ["Normal", "Normal", config.styles.normal],
    ["Heading1", "heading 1", config.styles.heading1],
    ["Heading2", "heading 2", config.styles.heading2],
    ["Heading3", "heading 3", config.styles.heading3],
    ["Heading4", "heading 4", config.styles.heading4],
  ];

  for (const [styleId, styleName, def] of styleMap) {
    if (!def) continue;
    stylesXml = replaceStyleInXml(stylesXml, styleId, styleName, def);
  }

  zip.file("word/styles.xml", stylesXml);

  // Patch document.xml margins
  const docFile = zip.file("word/document.xml");
  if (docFile) {
    let docXml = await docFile.async("string");
    docXml = replaceMarginsInDocXml(docXml, config.pageMargins);
    zip.file("word/document.xml", docXml);
  }

  // Write reference.docx
  const refPath = join(outputDir, "reference.docx");
  const outBuf = await zip.generateAsync({ type: "nodebuffer" });
  writeFileSync(refPath, outBuf);
  console.log(`  -> ${refPath}`);

  // Clean up temp file
  try {
    unlinkSync(tmpDocx);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { input, outputDir, mode } = parseCliArgs();
  const ext = extname(input).toLowerCase();

  if (ext !== ".doc" && ext !== ".docx") {
    console.error("Error: Input must be a .doc or .docx file.");
    process.exit(1);
  }

  if (!existsSync(input)) {
    console.error(`Error: File not found: ${input}`);
    process.exit(1);
  }

  // Dependency check — require soffice only for .doc
  const required = ["pandoc"];
  if (ext === ".doc") required.push("soffice");
  ensureDeps(required);

  mkdirSync(outputDir, { recursive: true });

  // Step 1: Ensure we have a .docx
  let docxPath = input;
  if (ext === ".doc") {
    docxPath = convertDocToDocx(input, outputDir);
  } else {
    console.log("[1/4] Input is .docx, using directly.");
  }

  // Step 2: Parse format — mode determines strategy
  let config: FormatConfig | null = null;

  if (mode === "text") {
    config = await parseDocxText(docxPath);
    if (!config) {
      console.error("Error: Could not extract format from document text. Try --mode style.");
      process.exit(1);
    }
  } else if (mode === "style") {
    config = await parseDocx(docxPath);
  } else {
    // auto: try text first, fall back to style
    config = await parseDocxText(docxPath);
    if (!config) {
      console.log("  Falling back to style extraction mode ...");
      config = await parseDocx(docxPath);
    }
  }

  // Step 3: Write format-config.json
  writeFormatConfig(config, outputDir);

  // Step 4: Generate reference.docx
  await generateReferenceDox(config, outputDir);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
