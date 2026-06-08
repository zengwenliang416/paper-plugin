#!/usr/bin/env npx tsx
/**
 * review-outline.ts — Build a clustered literature-review skeleton from a BibTeX file.
 *
 * Scaffolding only: parses entries, extracts title terms, clusters by the most
 * frequent shared term, and emits a review skeleton with synthesis/gap slots for
 * the model to fill. It does NOT write review prose. Works best on English titles;
 * entries with no usable terms fall into the "misc" cluster.
 *
 * Usage:
 *   review-outline.ts <bib>          print a markdown review skeleton
 *   review-outline.ts <bib> --json   print the structured outline (deterministic)
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const STOP = new Set([
  "the", "and", "for", "with", "using", "via", "based", "toward", "towards", "from",
  "this", "that", "these", "those", "study", "studies", "paper", "papers", "approach",
  "approaches", "method", "methods", "survey", "review", "reviews", "novel", "into",
  "over", "under", "between", "about", "research", "their", "its", "are", "our",
]);

interface Paper {
  key: string;
  title: string;
  year: string;
  terms: string[];
}

function parseBib(content: string): Paper[] {
  const papers: Paper[] = [];
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
    const titleMatch =
      raw.match(/title\s*=\s*\{([^}]*)\}/i) ?? raw.match(/title\s*=\s*"([^"]*)"/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";
    const year = (raw.match(/year\s*=\s*\{?(\d{4})\}?/i) ?? [])[1] ?? "";
    papers.push({ key, title, year, terms: extractTerms(title) });
  }
  return papers;
}

function extractTerms(title: string): string[] {
  const words = title.toLowerCase().match(/[a-z]+/g) ?? [];
  return [...new Set(words.filter((w) => w.length > 3 && !STOP.has(w)))];
}

function buildClusters(papers: Paper[]): Record<string, string[]> {
  const freq = new Map<string, number>();
  for (const p of papers) for (const t of p.terms) freq.set(t, (freq.get(t) ?? 0) + 1);

  const clusters: Record<string, string[]> = {};
  for (const p of papers) {
    const significant = p.terms.filter((t) => (freq.get(t) ?? 0) >= 2);
    let best: string | null = null;
    let bestCount = 0;
    for (const t of significant) {
      const c = freq.get(t) ?? 0;
      // tie-break: higher freq, then lexicographically smaller term (deterministic)
      if (c > bestCount || (c === bestCount && (best === null || t < best))) {
        best = t;
        bestCount = c;
      }
    }
    const key = best ?? "misc";
    (clusters[key] ??= []).push(p.key);
  }
  return clusters;
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    json: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  console.log("Usage: npx tsx scripts/review-outline.ts <bib> [--json]");
  process.exit(0);
}

const bibArg = positionals[0];
if (!bibArg) {
  console.log("Usage: npx tsx scripts/review-outline.ts <bib> [--json]");
  process.exit(2);
}
const bibPath = resolve(bibArg);
if (!existsSync(bibPath)) {
  console.error(`Error: bib file not found: ${bibPath}`);
  process.exit(3);
}

const papers = parseBib(readFileSync(bibPath, "utf8"));
if (papers.length === 0) {
  console.error("Error: no BibTeX entries found.");
  process.exit(3);
}

const clusters = buildClusters(papers);
const timeline = [...papers].sort((a, b) => (a.year || "").localeCompare(b.year || "") || a.key.localeCompare(b.key));
const titleOf = (key: string): string => papers.find((p) => p.key === key)?.title ?? "";

if (values.json) {
  console.log(JSON.stringify({ total: papers.length, clusters, timeline: timeline.map((p) => ({ key: p.key, year: p.year, title: p.title })) }, null, 2));
  process.exit(0);
}

const lines: string[] = [];
lines.push(`# Literature Review Skeleton`, ``, `Source: ${bibArg} · ${papers.length} papers`, ``);
lines.push(`## Timeline`);
for (const p of timeline) lines.push(`- ${p.year || "????"} [@${p.key}] ${p.title || "(no title)"}`);
lines.push(``, `## Clusters (by shared title term — refine semantically)`);
const orderedClusters = Object.keys(clusters).sort((a, b) => clusters[b].length - clusters[a].length || a.localeCompare(b));
for (const term of orderedClusters) {
  lines.push(``, `### ${term} (${clusters[term].length})`);
  for (const key of clusters[term]) lines.push(`- [@${key}] ${titleOf(key)}`);
  lines.push(`> Synthesis: <shared approach / what differs / settled / contested>`);
  lines.push(`> Gap: <what this cluster leaves open>`);
}
lines.push(``, `## Cross-cutting gaps`, `> <gaps spanning clusters; pick 1–3 to motivate the contribution>`);
console.log(lines.join("\n"));
