#!/usr/bin/env npx tsx
/**
 * ref-search.ts — Reference search and BibTeX management.
 *
 * Subcommands:
 *   doi <DOI> [--bib <path>]                    Fetch BibTeX via DOI.org
 *   search <query> [--limit N] [--bib <path>]   Search CrossRef / DBLP
 *   list [--bib <path>]                          List all cite keys
 *   check [--bib <path>] [--content <dir>]       Check refs vs content
 *
 * Usage:
 *   npx tsx scripts/ref-search.ts doi "10.1145/3292500.3330701" --bib assets/refs.bib
 *   npx tsx scripts/ref-search.ts search "attention is all you need" --limit 5
 *   npx tsx scripts/ref-search.ts list --bib assets/refs.bib
 *   npx tsx scripts/ref-search.ts check --bib assets/refs.bib --content content/
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    bib: { type: "string" },
    content: { type: "string" },
    limit: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

function printHelp(): void {
  console.log(`Usage: npx tsx scripts/ref-search.ts <command> [args] [options]

Commands:
  doi <DOI> [--bib <path>]                  Fetch BibTeX via DOI.org content negotiation
                                            Auto-generate cite key (authorYear)
                                            Append to bib file if --bib given

  search <query> [--limit N] [--bib <path>] Search CrossRef API for papers
                                            Display candidates with metadata
                                            If --bib given, prompt to add entries

  list [--bib <path>]                       Parse bib file and list all cite keys + titles

  check [--bib <path>] [--content <dir>]    Scan content/*.md for [@key] references
                                            Compare with bib file entries
                                            Report undefined refs and unused entries

Options:
  --bib <path>       BibTeX file path (default: ./assets/refs.bib)
  --content <dir>    Content directory (default: ./content/)
  --limit <N>        Max search results (default: 5)
  -h, --help         Show this help

Examples:
  npx tsx scripts/ref-search.ts doi "10.1145/3292500.3330701"
  npx tsx scripts/ref-search.ts search "transformer attention mechanism" --limit 10
  npx tsx scripts/ref-search.ts list
  npx tsx scripts/ref-search.ts check`);
}

if (values.help) {
  printHelp();
  process.exit(0);
}

if (positionals.length === 0) {
  printHelp();
  process.exit(1);
}

const command = positionals[0];
const bibPath = resolve(values.bib ?? "./assets/refs.bib");
const contentDir = resolve(values.content ?? "./content/");
const searchLimit = parseInt(values.limit ?? "5", 10);

// ---------------------------------------------------------------------------
// BibTeX helpers
// ---------------------------------------------------------------------------

interface BibEntry {
  key: string;
  type: string;
  title: string;
  raw: string;
}

/**
 * Parse bib file to extract entries. Uses brace-counting for robustness.
 */
function parseBibFile(filePath: string): BibEntry[] {
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, "utf-8");
  const entries: BibEntry[] = [];

  // Match entry starts: @type{key,
  const entryStartRe = /@(\w+)\s*\{([^,]+),/g;
  let match: RegExpExecArray | null;

  while ((match = entryStartRe.exec(content)) !== null) {
    const type = match[1].toLowerCase();
    const key = match[2].trim();

    // Skip non-entry types like @string, @preamble, @comment
    if (["string", "preamble", "comment"].includes(type)) continue;

    // Find the matching closing brace by counting
    let braceDepth = 1;
    let i = match.index + match[0].length;
    while (i < content.length && braceDepth > 0) {
      if (content[i] === "{") braceDepth++;
      else if (content[i] === "}") braceDepth--;
      i++;
    }

    const raw = content.slice(match.index, i);

    // Extract title
    const titleMatch = raw.match(/title\s*=\s*\{([^}]*)\}/i)
      ?? raw.match(/title\s*=\s*"([^"]*)"/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";

    entries.push({ key, type, title, raw });
  }

  return entries;
}

/**
 * Check if a cite key already exists in the bib file.
 */
function keyExistsInBib(key: string, entries: BibEntry[]): boolean {
  return entries.some((e) => e.key === key);
}

/**
 * Append a BibTeX entry to the bib file.
 */
function appendToBib(filePath: string, bibtex: string): void {
  let existing = "";
  if (existsSync(filePath)) {
    existing = readFileSync(filePath, "utf-8");
    if (!existing.endsWith("\n")) existing += "\n";
  }
  writeFileSync(filePath, existing + "\n" + bibtex.trim() + "\n", "utf-8");
}

/**
 * Extract first author last name from BibTeX author field.
 * Handles: "LastName, FirstName and ..." or "FirstName LastName and ..."
 */
function extractFirstAuthorLastName(authorField: string): string {
  const firstAuthor = authorField.split(/\s+and\s+/i)[0].trim();

  if (firstAuthor.includes(",")) {
    // "LastName, FirstName" format
    return firstAuthor.split(",")[0].trim().toLowerCase();
  }

  // "FirstName LastName" format — take last word
  const parts = firstAuthor.split(/\s+/);
  return (parts[parts.length - 1] ?? "unknown").toLowerCase();
}

/**
 * Extract year from BibTeX year field.
 */
function extractYear(bibtex: string): string {
  const m = bibtex.match(/year\s*=\s*\{?(\d{4})\}?/i);
  return m ? m[1] : "0000";
}

/**
 * Extract author from BibTeX.
 */
function extractAuthor(bibtex: string): string {
  const m = bibtex.match(/author\s*=\s*\{([^}]+)\}/i)
    ?? bibtex.match(/author\s*=\s*"([^"]+)"/i);
  return m ? m[1] : "";
}

/**
 * Generate a unique cite key: firstauthorlastname + year, with a/b/c suffix for duplicates.
 */
function generateCiteKey(bibtex: string, existingEntries: BibEntry[]): string {
  const author = extractAuthor(bibtex);
  const year = extractYear(bibtex);
  const lastName = extractFirstAuthorLastName(author) || "unknown";

  // Clean: keep only ASCII letters
  const cleanName = lastName.replace(/[^a-z]/gi, "").toLowerCase();
  const baseKey = `${cleanName}${year}`;

  if (!keyExistsInBib(baseKey, existingEntries)) return baseKey;

  // Append a/b/c/... suffix
  const suffixes = "abcdefghijklmnopqrstuvwxyz";
  for (const s of suffixes) {
    const candidate = `${baseKey}${s}`;
    if (!keyExistsInBib(candidate, existingEntries)) return candidate;
  }

  // Fallback: append timestamp
  return `${baseKey}_${Date.now()}`;
}

/**
 * Replace the cite key in a BibTeX string.
 */
function replaceCiteKey(bibtex: string, newKey: string): string {
  return bibtex.replace(/@(\w+)\s*\{[^,]+,/, `@$1{${newKey},`);
}

// ---------------------------------------------------------------------------
// Network helpers
// ---------------------------------------------------------------------------

const PACKAGE_NAME = "paper-literature/1.0";
const PACKAGE_EMAIL = "paper-literature@example.com";
const USER_AGENT = `${PACKAGE_NAME} (mailto:${PACKAGE_EMAIL})`;

/**
 * Fetch BibTeX for a DOI from doi.org using content negotiation.
 */
async function fetchBibtexFromDoi(doi: string): Promise<string> {
  const url = `https://doi.org/${doi}`;
  const resp = await fetch(url, {
    headers: {
      Accept: "application/x-bibtex",
      "User-Agent": USER_AGENT,
    },
    redirect: "follow",
  });

  if (!resp.ok) {
    throw new Error(`DOI.org returned ${resp.status}: ${resp.statusText}`);
  }

  const text = await resp.text();
  if (!text.includes("@")) {
    throw new Error("Response does not contain BibTeX data");
  }

  return text.trim();
}

/**
 * CrossRef search result.
 */
interface CrossRefResult {
  title: string;
  authors: string[];
  year: number;
  doi: string;
  type: string;
  citations: number;
  container: string;
}

/**
 * Search CrossRef API.
 */
async function searchCrossRef(query: string, limit: number): Promise<CrossRefResult[]> {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query", query);
  url.searchParams.set("rows", String(limit));
  url.searchParams.set("mailto", PACKAGE_EMAIL);

  const resp = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!resp.ok) {
    throw new Error(`CrossRef returned ${resp.status}: ${resp.statusText}`);
  }

  const data = await resp.json() as any;
  const items = data?.message?.items ?? [];

  return items.map((item: any) => ({
    title: (item.title ?? [])[0] ?? "(no title)",
    authors: (item.author ?? []).map((a: any) =>
      [a.given, a.family].filter(Boolean).join(" ")
    ),
    year: item.published?.["date-parts"]?.[0]?.[0]
      ?? item.created?.["date-parts"]?.[0]?.[0]
      ?? 0,
    doi: item.DOI ?? "",
    type: item.type ?? "",
    citations: item["is-referenced-by-count"] ?? 0,
    container: (item["container-title"] ?? [])[0] ?? "",
  }));
}

/**
 * DBLP search result.
 */
interface DblpResult {
  title: string;
  authors: string[];
  year: number;
  doi: string;
  venue: string;
  url: string;
}

/**
 * Search DBLP API (fallback for CS papers).
 */
async function searchDblp(query: string, limit: number): Promise<DblpResult[]> {
  const url = new URL("https://dblp.org/search/publ/api");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("h", String(limit));

  const resp = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!resp.ok) {
    throw new Error(`DBLP returned ${resp.status}: ${resp.statusText}`);
  }

  const data = await resp.json() as any;
  const hits = data?.result?.hits?.hit ?? [];

  return hits.map((hit: any) => {
    const info = hit.info ?? {};
    let authors: string[] = [];
    if (info.authors?.author) {
      const a = info.authors.author;
      authors = Array.isArray(a)
        ? a.map((x: any) => (typeof x === "string" ? x : x.text ?? ""))
        : [typeof a === "string" ? a : a.text ?? ""];
    }
    return {
      title: info.title ?? "(no title)",
      authors,
      year: parseInt(info.year ?? "0", 10),
      doi: info.doi ?? "",
      venue: info.venue ?? "",
      url: info.url ?? "",
    };
  });
}

// ---------------------------------------------------------------------------
// Interactive prompt helper
// ---------------------------------------------------------------------------

function askUser(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ---------------------------------------------------------------------------
// Command: doi
// ---------------------------------------------------------------------------

async function cmdDoi(): Promise<void> {
  const doi = positionals[1];
  if (!doi) {
    console.error("Error: DOI is required.");
    console.error("Usage: npx tsx scripts/ref-search.ts doi <DOI> [--bib <path>]");
    process.exit(1);
  }

  // Normalize DOI: strip URL prefix if present
  const cleanDoi = doi
    .replace(/^https?:\/\/doi\.org\//i, "")
    .replace(/^doi:/i, "")
    .trim();

  console.log(`Fetching BibTeX for DOI: ${cleanDoi}`);

  let bibtex: string;
  try {
    bibtex = await fetchBibtexFromDoi(cleanDoi);
  } catch (err: any) {
    console.error(`Error fetching BibTeX: ${err.message}`);
    process.exit(1);
  }

  // Generate cite key
  const existingEntries = parseBibFile(bibPath);
  const citeKey = generateCiteKey(bibtex, existingEntries);
  bibtex = replaceCiteKey(bibtex, citeKey);

  console.log(`\nCite key: ${citeKey}`);
  console.log("---");
  console.log(bibtex);
  console.log("---");

  // Append to bib file
  if (keyExistsInBib(citeKey, existingEntries)) {
    console.log(`\nWarning: key "${citeKey}" already exists in ${bibPath}`);
    console.log("Entry NOT appended.");
    return;
  }

  appendToBib(bibPath, bibtex);
  console.log(`\nAppended to: ${bibPath}`);
  console.log(`Use in Markdown: [@${citeKey}]`);
}

// ---------------------------------------------------------------------------
// Command: search
// ---------------------------------------------------------------------------

async function cmdSearch(): Promise<void> {
  const query = positionals.slice(1).join(" ");
  if (!query) {
    console.error("Error: search query is required.");
    console.error("Usage: npx tsx scripts/ref-search.ts search <query> [--limit N] [--bib <path>]");
    process.exit(1);
  }

  console.log(`Searching CrossRef for: "${query}" (limit: ${searchLimit})`);

  let crossRefResults: CrossRefResult[] = [];
  let dblpResults: DblpResult[] = [];

  // Query CrossRef and DBLP in parallel
  const [crResult, dblpResult] = await Promise.allSettled([
    searchCrossRef(query, searchLimit),
    searchDblp(query, searchLimit),
  ]);

  if (crResult.status === "fulfilled") {
    crossRefResults = crResult.value;
  } else {
    console.warn(`CrossRef search failed: ${crResult.reason?.message ?? "unknown error"}`);
  }

  if (dblpResult.status === "fulfilled") {
    dblpResults = dblpResult.value;
  } else {
    // DBLP is fallback, not critical
  }

  if (crossRefResults.length === 0 && dblpResults.length === 0) {
    console.log("No results found.");
    process.exit(0);
  }

  // Display CrossRef results
  const allResults: { index: number; doi: string; title: string; source: string }[] = [];
  let idx = 1;

  if (crossRefResults.length > 0) {
    console.log(`\n--- CrossRef Results ---\n`);
    for (const r of crossRefResults) {
      const authors = r.authors.length > 0
        ? r.authors.slice(0, 3).join(", ") + (r.authors.length > 3 ? " et al." : "")
        : "(unknown authors)";
      console.log(`  [${idx}] ${r.title}`);
      console.log(`      Authors: ${authors}`);
      console.log(`      Year: ${r.year || "?"} | DOI: ${r.doi || "-"} | Citations: ${r.citations}`);
      if (r.container) console.log(`      Published in: ${r.container}`);
      console.log();
      allResults.push({ index: idx, doi: r.doi, title: r.title, source: "crossref" });
      idx++;
    }
  }

  // Display DBLP results (only ones not already in CrossRef by DOI)
  const crossRefDois = new Set(crossRefResults.map((r) => r.doi).filter(Boolean));
  const uniqueDblp = dblpResults.filter((r) => !r.doi || !crossRefDois.has(r.doi));

  if (uniqueDblp.length > 0) {
    console.log(`\n--- DBLP Results ---\n`);
    for (const r of uniqueDblp) {
      const authors = r.authors.length > 0
        ? r.authors.slice(0, 3).join(", ") + (r.authors.length > 3 ? " et al." : "")
        : "(unknown authors)";
      console.log(`  [${idx}] ${r.title}`);
      console.log(`      Authors: ${authors}`);
      console.log(`      Year: ${r.year || "?"} | DOI: ${r.doi || "-"} | Venue: ${r.venue || "-"}`);
      console.log();
      allResults.push({ index: idx, doi: r.doi, title: r.title, source: "dblp" });
      idx++;
    }
  }

  // If --bib is specified, offer to add entries
  if (values.bib !== undefined || existsSync(bibPath)) {
    // Check if stdin is a TTY (interactive)
    if (!process.stdin.isTTY) {
      console.log("Non-interactive mode. Use 'doi' command to add specific entries.");
      return;
    }

    const answer = await askUser(
      `Add to ${bibPath}? Enter numbers (e.g. 1,3) or 'n' to skip: `
    );

    if (answer.toLowerCase() === "n" || answer === "") {
      return;
    }

    const selectedIndices = answer
      .split(/[,\s]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => !isNaN(n));

    const existingEntries = parseBibFile(bibPath);

    for (const selectedIdx of selectedIndices) {
      const result = allResults.find((r) => r.index === selectedIdx);
      if (!result) {
        console.warn(`  Skipping invalid index: ${selectedIdx}`);
        continue;
      }

      if (!result.doi) {
        console.warn(`  [${selectedIdx}] "${result.title}" has no DOI, skipping.`);
        continue;
      }

      console.log(`  Fetching BibTeX for [${selectedIdx}] (DOI: ${result.doi})...`);

      try {
        let bibtex = await fetchBibtexFromDoi(result.doi);
        const citeKey = generateCiteKey(bibtex, existingEntries);
        bibtex = replaceCiteKey(bibtex, citeKey);

        if (keyExistsInBib(citeKey, existingEntries)) {
          console.log(`  Key "${citeKey}" already exists, skipping.`);
          continue;
        }

        appendToBib(bibPath, bibtex);
        // Track newly added entries to avoid key collisions within this batch
        existingEntries.push({
          key: citeKey,
          type: "",
          title: result.title,
          raw: bibtex,
        });
        console.log(`  Added: @${citeKey} → ${bibPath}`);
      } catch (err: any) {
        console.warn(`  Failed to fetch BibTeX for DOI ${result.doi}: ${err.message}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Command: list
// ---------------------------------------------------------------------------

function cmdList(): void {
  if (!existsSync(bibPath)) {
    console.error(`Error: bib file not found: ${bibPath}`);
    process.exit(1);
  }

  const entries = parseBibFile(bibPath);

  if (entries.length === 0) {
    console.log("No entries found in bib file.");
    return;
  }

  console.log(`Entries in ${bibPath} (${entries.length}):\n`);

  const maxKeyLen = Math.max(...entries.map((e) => e.key.length), 4);

  for (const e of entries) {
    const key = e.key.padEnd(maxKeyLen);
    const title = e.title || "(no title)";
    console.log(`  @${e.type}{${key}}  ${title}`);
  }
}

// ---------------------------------------------------------------------------
// Command: check
// ---------------------------------------------------------------------------

function cmdCheck(): void {
  // Parse bib file
  if (!existsSync(bibPath)) {
    console.error(`Error: bib file not found: ${bibPath}`);
    console.error("Create one with: npx tsx scripts/ref-search.ts doi <DOI> --bib assets/refs.bib");
    process.exit(1);
  }

  const bibEntries = parseBibFile(bibPath);
  const bibKeys = new Set(bibEntries.map((e) => e.key));

  // Scan content/*.md for [@key] references
  if (!existsSync(contentDir)) {
    console.error(`Error: content directory not found: ${contentDir}`);
    process.exit(1);
  }

  const mdFiles = readdirSync(contentDir).filter((f) => f.endsWith(".md"));

  if (mdFiles.length === 0) {
    console.warn("Warning: no .md files found in content directory.");
  }

  // Collect all referenced keys from markdown
  const referencedKeys = new Map<string, string[]>(); // key -> [files]

  for (const filename of mdFiles) {
    const content = readFileSync(join(contentDir, filename), "utf-8");

    // Match [@key] or [@key1; @key2] patterns (pandoc citation syntax)
    const citationRe = /\[@([^\]]+)\]/g;
    let match: RegExpExecArray | null;

    while ((match = citationRe.exec(content)) !== null) {
      // Split multiple citations: [@key1; @key2; @key3]
      const inner = match[1];
      const keys = inner.split(/\s*;\s*/).map((s) =>
        s.replace(/^@/, "").replace(/^-/, "").trim()
      ).filter(Boolean);

      for (const key of keys) {
        // Strip optional prefix/suffix like p. 123
        const cleanKey = key.split(/\s*,\s*/)[0].trim();
        if (!cleanKey) continue;

        const files = referencedKeys.get(cleanKey) ?? [];
        if (!files.includes(filename)) files.push(filename);
        referencedKeys.set(cleanKey, files);
      }
    }
  }

  // Report
  const usedKeys = new Set(referencedKeys.keys());

  // Undefined references: used in content but not in bib
  const undefinedRefs = [...usedKeys].filter((k) => !bibKeys.has(k));

  // Unused entries: in bib but not referenced in content
  const unusedEntries = [...bibKeys].filter((k) => !usedKeys.has(k));

  console.log(`\nReference Check Report`);
  console.log(`${"=".repeat(50)}`);
  console.log(`  Bib entries:    ${bibKeys.size}`);
  console.log(`  Refs in content: ${usedKeys.size}`);
  console.log(`  MD files:        ${mdFiles.length}`);

  if (undefinedRefs.length > 0) {
    console.log(`\nUndefined references (${undefinedRefs.length}):`);
    for (const key of undefinedRefs.sort()) {
      const files = referencedKeys.get(key) ?? [];
      console.log(`  [@${key}]  used in: ${files.join(", ")}`);
    }
  } else {
    console.log(`\nAll references are defined.`);
  }

  if (unusedEntries.length > 0) {
    console.log(`\nUnused bib entries (${unusedEntries.length}):`);
    for (const key of unusedEntries.sort()) {
      const entry = bibEntries.find((e) => e.key === key);
      const title = entry?.title ? ` — ${entry.title}` : "";
      console.log(`  @${key}${title}`);
    }
  } else {
    console.log(`\nAll bib entries are referenced.`);
  }

  // Exit code: non-zero if undefined refs found
  if (undefinedRefs.length > 0) {
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  switch (command) {
    case "doi":
      await cmdDoi();
      break;
    case "search":
      await cmdSearch();
      break;
    case "list":
      cmdList();
      break;
    case "check":
      cmdCheck();
      break;
    default:
      console.error(`Error: unknown command "${command}"`);
      console.error("Available commands: doi, search, list, check");
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
