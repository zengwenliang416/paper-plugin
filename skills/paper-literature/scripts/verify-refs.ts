#!/usr/bin/env npx tsx
/**
 * verify-refs.ts — Batch citation authenticity verification.
 *
 * Reads a BibTeX file and verifies each entry against external indexes
 * (CrossRef by DOI / by title, OpenAlex by title), compares metadata, and
 * classifies each reference. Implements the wf2 / thesis-reference-audit
 * method as an automated check. It does NOT edit the manuscript's
 * citations.tsv (cross-owner); use --out to emit a verification TSV.
 *
 * Usage:
 *   verify-refs.ts [bib]              verify ./assets/refs.bib (or given path)
 *   verify-refs.ts [bib] --out v.tsv  also write a verification TSV
 *   verify-refs.ts [bib] --json       print full JSON report
 *   verify-refs.ts --classify f.json  classify-only from evidence (no network)
 *   [--limit N] [--concurrency N]
 *
 * Exit: 1 when any not_found or mismatch is found, else 0.
 *
 * Status labels (from wf2): verified | mismatch | not_found | suspicious | manual_needed
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const MAILTO = "paper-literature@example.com";
const USER_AGENT = `paper-literature/1.0 (mailto:${MAILTO})`;
const TIMEOUT_MS = 30_000;

type Status = "verified" | "mismatch" | "not_found" | "suspicious" | "manual_needed";

interface BibRef {
  key: string;
  title: string;
  year: string;
  firstAuthor: string;
  doi: string;
}

interface Candidate {
  title: string;
  year: string;
  firstAuthor: string;
  source: string;
}

interface Evidence {
  doi_checked?: boolean;
  doi_resolved?: boolean;
  doi_title?: string;
  candidates: Candidate[];
  error?: string;
}

interface VerifyResult {
  key: string;
  title: string;
  doi: string;
  status: Status;
  matched_source: string;
  note: string;
}

// --------------------------------------------------------------------------
// Pure comparison + classification (unit-tested via --classify)
// --------------------------------------------------------------------------

function norm(text: string): string {
  return (text || "").toLowerCase().replace(/[^a-z0-9一-鿿]+/g, "");
}

function titleExact(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return Math.min(na.length, nb.length) >= 12 && (na.includes(nb) || nb.includes(na));
}

function titleSimilar(a: string, b: string): boolean {
  if (titleExact(a, b)) return true;
  // token Jaccard on word boundaries of the original strings
  const ta = new Set((a.toLowerCase().match(/[a-z0-9一-鿿]+/g) || []));
  const tb = new Set((b.toLowerCase().match(/[a-z0-9一-鿿]+/g) || []));
  if (ta.size === 0 || tb.size === 0) return false;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const jaccard = inter / (ta.size + tb.size - inter);
  return jaccard >= 0.6;
}

function classify(entry: BibRef, evidence: Evidence): { status: Status; matched_source: string; note: string } {
  if (evidence.error) {
    return { status: "manual_needed", matched_source: "", note: `all sources failed: ${evidence.error}` };
  }

  // DOI path: a declared DOI that does not resolve is a strong red flag.
  if (entry.doi) {
    if (evidence.doi_resolved === false) {
      return { status: "suspicious", matched_source: "crossref-doi", note: "declared DOI did not resolve" };
    }
    if (evidence.doi_resolved && evidence.doi_title) {
      if (titleSimilar(evidence.doi_title, entry.title)) {
        return { status: "verified", matched_source: "crossref-doi", note: "DOI resolves, title matches" };
      }
      return { status: "mismatch", matched_source: "crossref-doi", note: "DOI resolves but title differs" };
    }
  }

  // Title path: search candidates across indexes. A reference is "found" when
  // a candidate title matches; year is noisy metadata (reprint/preprint/variant),
  // so a title-exact match with a differing year stays verified with a note.
  const matches = evidence.candidates.filter((c) => titleSimilar(c.title, entry.title));
  if (matches.length > 0) {
    const sources = [...new Set(matches.map((m) => m.source))].join("+");
    const yearMatch = matches.find((m) => !entry.year || !m.year || entry.year === m.year);
    if (yearMatch) {
      return { status: "verified", matched_source: sources, note: `title (and year) match across ${sources}` };
    }
    const exact = matches.find((m) => titleExact(m.title, entry.title));
    if (exact) {
      return { status: "verified", matched_source: sources, note: `found, but year differs (${entry.year} vs ${exact.year}) — verify edition/preprint` };
    }
    return { status: "suspicious", matched_source: sources, note: "title only loosely matches and year differs; verify manually" };
  }

  if (evidence.candidates.length === 0) {
    return { status: "not_found", matched_source: "", note: "no index returned a matching record (possible fabrication)" };
  }
  return { status: "suspicious", matched_source: "", note: "indexes returned records but none matched the title" };
}

// --------------------------------------------------------------------------
// BibTeX parsing (lightweight, self-contained)
// --------------------------------------------------------------------------

function parseBib(content: string): BibRef[] {
  const refs: BibRef[] = [];
  const startRe = /@(\w+)\s*\{([^,]+),/g;
  let match: RegExpExecArray | null;
  while ((match = startRe.exec(content)) !== null) {
    const type = match[1].toLowerCase();
    if (["string", "preamble", "comment"].includes(type)) continue;
    const key = match[2].trim();
    let depth = 1;
    let i = match.index + match[0].length;
    while (i < content.length && depth > 0) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") depth--;
      i++;
    }
    const raw = content.slice(match.index, i);
    const field = (name: string): string => {
      const m =
        raw.match(new RegExp(`${name}\\s*=\\s*\\{([^}]*)\\}`, "i")) ??
        raw.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
      return m ? m[1].replace(/\s+/g, " ").trim() : "";
    };
    const author = field("author");
    refs.push({
      key,
      title: field("title"),
      year: (raw.match(/year\s*=\s*\{?(\d{4})\}?/i) ?? [])[1] ?? "",
      firstAuthor: firstAuthorLastName(author),
      doi: field("doi").replace(/^https?:\/\/doi\.org\//i, ""),
    });
  }
  return refs;
}

function firstAuthorLastName(authorField: string): string {
  if (!authorField) return "";
  const first = authorField.split(/\s+and\s+/i)[0].trim();
  if (first.includes(",")) return first.split(",")[0].trim().toLowerCase();
  const parts = first.split(/\s+/);
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

// --------------------------------------------------------------------------
// Network sources
// --------------------------------------------------------------------------

async function getJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: controller.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

async function crossRefByDoi(doi: string): Promise<{ title: string } | null> {
  try {
    const data = await getJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=${MAILTO}`);
    const title = (data?.message?.title ?? [])[0];
    return title ? { title } : null;
  } catch {
    return null;
  }
}

async function crossRefByTitle(title: string): Promise<Candidate[]> {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query.bibliographic", title);
  url.searchParams.set("rows", "3");
  url.searchParams.set("mailto", MAILTO);
  const data = await getJson(url.toString());
  return (data?.message?.items ?? []).map((it: any) => ({
    title: (it.title ?? [])[0] ?? "",
    year: String(it.published?.["date-parts"]?.[0]?.[0] ?? it.created?.["date-parts"]?.[0]?.[0] ?? ""),
    firstAuthor: (it.author?.[0]?.family ?? "").toLowerCase(),
    source: "crossref",
  }));
}

async function openAlexByTitle(title: string): Promise<Candidate[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", title);
  url.searchParams.set("per_page", "3");
  url.searchParams.set("mailto", MAILTO);
  const data = await getJson(url.toString());
  return (data?.results ?? []).map((w: any) => ({
    title: w.title ?? w.display_name ?? "",
    year: String(w.publication_year ?? ""),
    firstAuthor: (w.authorships?.[0]?.author?.display_name ?? "").split(/\s+/).pop()?.toLowerCase() ?? "",
    source: "openalex",
  }));
}

async function gatherEvidence(entry: BibRef): Promise<Evidence> {
  const evidence: Evidence = { candidates: [] };
  try {
    if (entry.doi) {
      evidence.doi_checked = true;
      const doiMeta = await crossRefByDoi(entry.doi);
      evidence.doi_resolved = doiMeta !== null;
      if (doiMeta) evidence.doi_title = doiMeta.title;
    }
    if (entry.title) {
      const [cr, oa] = await Promise.allSettled([crossRefByTitle(entry.title), openAlexByTitle(entry.title)]);
      if (cr.status === "fulfilled") evidence.candidates.push(...cr.value);
      if (oa.status === "fulfilled") evidence.candidates.push(...oa.value);
      if (cr.status === "rejected" && oa.status === "rejected" && evidence.doi_checked !== true) {
        evidence.error = "title lookups failed";
      }
    }
  } catch (error: any) {
    evidence.error = error.message;
  }
  return evidence;
}

// --------------------------------------------------------------------------
// Concurrency helper
// --------------------------------------------------------------------------

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// --------------------------------------------------------------------------
// CLI
// --------------------------------------------------------------------------

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string" },
    limit: { type: "string" },
    concurrency: { type: "string" },
    classify: { type: "string" },
    json: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

function printHelp(): void {
  console.log(`Usage: npx tsx scripts/verify-refs.ts [bib] [options]

  [bib]               BibTeX file (default ./assets/refs.bib)
  --out <tsv>         write a verification TSV (does not touch citations.tsv)
  --json              print the full JSON report
  --classify <json>   classify from an evidence file only (no network) — for tests
  --limit <N>         verify only the first N entries
  --concurrency <N>   parallel lookups (default 4)
  -h, --help          show help`);
}

if (values.help) {
  printHelp();
  process.exit(0);
}

async function main(): Promise<number> {
  // Classify-only mode: deterministic, no network (tests + reuse).
  if (values.classify) {
    const fixtures = JSON.parse(readFileSync(resolve(values.classify), "utf8")) as {
      entry: BibRef;
      evidence: Evidence;
    }[];
    const out = fixtures.map((f) => ({ key: f.entry.key, ...classify(f.entry, f.evidence) }));
    console.log(JSON.stringify(out, null, 2));
    return 0;
  }

  const bibPath = resolve(positionals[0] ?? "./assets/refs.bib");
  if (!existsSync(bibPath)) {
    console.error(`Error: bib file not found: ${bibPath}`);
    return 3;
  }
  let refs = parseBib(readFileSync(bibPath, "utf8"));
  if (values.limit) refs = refs.slice(0, parseInt(values.limit, 10));
  if (refs.length === 0) {
    console.error("Error: no BibTeX entries found.");
    return 3;
  }

  const concurrency = parseInt(values.concurrency ?? "4", 10);
  const results: VerifyResult[] = await mapLimit(refs, concurrency, async (entry) => {
    const evidence = await gatherEvidence(entry);
    const { status, matched_source, note } = classify(entry, evidence);
    return { key: entry.key, title: entry.title, doi: entry.doi, status, matched_source, note };
  });

  const summary: Record<Status, number> = {
    verified: 0,
    mismatch: 0,
    not_found: 0,
    suspicious: 0,
    manual_needed: 0,
  };
  for (const r of results) summary[r.status]++;

  if (values.json) {
    console.log(JSON.stringify({ bib: bibPath, summary, results }, null, 2));
  } else {
    console.log(`Citation verification — ${bibPath}`);
    console.log(`${"=".repeat(56)}`);
    console.log(
      `  total ${results.length} | verified ${summary.verified} | mismatch ${summary.mismatch} | not_found ${summary.not_found} | suspicious ${summary.suspicious} | manual ${summary.manual_needed}`
    );
    const flagged = results.filter((r) => r.status !== "verified");
    if (flagged.length) {
      console.log(`\nFlagged:`);
      for (const r of flagged) console.log(`  [${r.status}] @${r.key} — ${r.title || "(no title)"}\n      ${r.note}`);
    } else {
      console.log(`\nAll references verified.`);
    }
  }

  if (values.out) {
    const header = "key\ttitle\tdoi\tverification_status\tverification_source\tnote";
    const rows = results.map((r) =>
      [r.key, r.title, r.doi, r.status, r.matched_source, r.note].map((c) => String(c).replace(/\t/g, " ")).join("\t")
    );
    writeFileSync(resolve(values.out), [header, ...rows, ""].join("\n"), "utf8");
    console.log(`\nWrote ${values.out}`);
  }

  return summary.not_found > 0 || summary.mismatch > 0 ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(3);
  });
