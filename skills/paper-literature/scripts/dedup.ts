#!/usr/bin/env npx tsx
/**
 * dedup.ts — Deterministic literature deduplication (implements references/dedup-engine.md).
 *
 * Merges literature result lists from multiple sources. DOI is the primary key;
 * when a DOI is missing from either record, it falls back to normalized title
 * (stopword-stripped) + first-author surname with Jaccard >= 0.90. When a
 * duplicate group spans sources it keeps the record with the most complete
 * metadata, preferring a publisher record over a preprint, citation count as
 * tiebreaker. This is the script form of the dedup-engine reference, reusable by
 * the multi-source search (wf1), citation verification (wf2), and related-papers
 * (wf5a) flows.
 *
 * Usage:
 *   dedup.ts records.json            dedup a JSON array of records
 *   dedup.ts records.json --json     full JSON report
 *   dedup.ts --classify cases.json   classify a case batch — for tests
 *
 * Record shape: { id?, doi?, title?, firstAuthor?, source?, year?, citationCount?, volume?, pages? }
 * Exit: 0 (dedup never fails on data); 3 on usage/IO error.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

interface Rec {
  id?: string;
  doi?: string;
  title?: string;
  firstAuthor?: string;
  source?: string;
  year?: string;
  citationCount?: number;
  volume?: string;
  pages?: string;
}

const STOPWORDS = new Set(["a", "an", "the", "in", "of", "for", "on", "to", "and", "with", "by", "et", "al"]);
const PREPRINT_SOURCES = new Set(["arxiv", "biorxiv", "medrxiv", "preprint", "ssrn", "osf", "researchsquare"]);
const JACCARD_THRESHOLD = 0.9;

// --------------------------------------------------------------------------
// Pure helpers (unit-tested via --classify)
// --------------------------------------------------------------------------

function normDoi(doi?: string): string {
  if (!doi) return "";
  const stripped = doi.replace(/^https?:\/\/doi\.org\//i, "").trim().toLowerCase();
  const m = stripped.match(/10\.\d{4,}\/\S+/);
  return m ? m[0] : "";
}

function titleTokens(title?: string): string[] {
  if (!title) return [];
  return title
    .toLowerCase()
    .replace(/[.,;:!?()[\]"'“”‘’]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t));
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function surname(firstAuthor?: string): string {
  if (!firstAuthor) return "";
  const first = firstAuthor.split(/\s+and\s+/i)[0].trim();
  if (first.includes(",")) return first.split(",")[0].trim().toLowerCase();
  const parts = first.split(/\s+/);
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

function isDuplicate(a: Rec, b: Rec): boolean {
  const da = normDoi(a.doi);
  const db = normDoi(b.doi);
  if (da && db) return da === db; // both have a DOI: decisive (same → dup, different → distinct)
  // at least one DOI missing → title + first-author fallback
  const sa = surname(a.firstAuthor);
  const sb = surname(b.firstAuthor);
  if (!sa || sa !== sb) return false;
  return jaccard(titleTokens(a.title), titleTokens(b.title)) >= JACCARD_THRESHOLD;
}

function completeness(r: Rec): number {
  return (normDoi(r.doi) ? 1 : 0) + (r.volume ? 1 : 0) + (r.pages ? 1 : 0);
}

function isPreprint(r: Rec): boolean {
  return PREPRINT_SOURCES.has((r.source || "").toLowerCase());
}

// Returns the record to keep from a duplicate pair (merge preference).
function preferred(a: Rec, b: Rec): Rec {
  const ca = completeness(a);
  const cb = completeness(b);
  if (ca !== cb) return ca > cb ? a : b;
  const pa = isPreprint(a);
  const pb = isPreprint(b);
  if (pa !== pb) return pa ? b : a; // publisher over preprint
  const cca = a.citationCount ?? -1;
  const ccb = b.citationCount ?? -1;
  if (cca !== ccb) return cca > ccb ? a : b;
  return a; // stable: keep the earlier record
}

function dedup(records: Rec[]): { kept: Rec[]; groups: Rec[][] } {
  const groups: Rec[][] = [];
  for (const r of records) {
    const g = groups.find((group) => group.some((member) => isDuplicate(member, r)));
    if (g) g.push(r);
    else groups.push([r]);
  }
  const kept = groups.map((g) => g.reduce((best, cur) => preferred(best, cur)));
  return { kept, groups };
}

// --------------------------------------------------------------------------
// CLI
// --------------------------------------------------------------------------

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    classify: { type: "string" },
    json: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

function printHelp(): void {
  console.log(`Usage: npx tsx scripts/dedup.ts <records.json> [options]

  <records.json>      JSON array of records to deduplicate
  --json              print the full JSON report (kept + duplicate groups)
  --classify <json>   classify a case batch [{ name, records }] — for tests
  -h, --help          show help`);
}

function main(): number {
  if (values.help) {
    printHelp();
    return 0;
  }

  if (values.classify) {
    const cases = JSON.parse(readFileSync(resolve(values.classify), "utf8")) as {
      name: string;
      records: Rec[];
    }[];
    const out = cases.map((c) => {
      const { kept } = dedup(c.records ?? []);
      return { name: c.name, keptCount: kept.length, keptIds: kept.map((r) => r.id ?? "").filter(Boolean) };
    });
    console.log(JSON.stringify(out, null, 2));
    return 0;
  }

  const input = positionals[0];
  if (!input) {
    printHelp();
    return 3;
  }
  const path = resolve(input);
  if (!existsSync(path)) {
    console.error(`Error: records file not found: ${path}`);
    return 3;
  }
  const records = JSON.parse(readFileSync(path, "utf8")) as Rec[];
  const { kept, groups } = dedup(records);

  if (values.json) {
    console.log(JSON.stringify({ total: records.length, kept: kept.length, kept_records: kept, groups }, null, 2));
  } else {
    console.log(`Dedup — ${path}`);
    console.log("=".repeat(56));
    console.log(`  ${records.length} record(s) → ${kept.length} kept, ${records.length - kept.length} duplicate(s) removed`);
    const merged = groups.filter((g) => g.length > 1);
    if (merged.length) {
      console.log(`\nMerged groups:`);
      for (const g of merged) {
        const rep = g.reduce((best, cur) => preferred(best, cur));
        console.log(`  keep [${rep.id ?? rep.doi ?? rep.title ?? "?"}] ← ${g.length} records (${g.map((r) => r.source || "?").join(", ")})`);
      }
    }
  }
  return 0;
}

try {
  process.exit(main());
} catch (error: any) {
  console.error(`Error: ${error.message}`);
  process.exit(3);
}
