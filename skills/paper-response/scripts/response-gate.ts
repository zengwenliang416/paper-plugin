#!/usr/bin/env npx tsx
/**
 * response-gate.ts — Deterministic readiness gate for reviewer-response packages.
 *
 * Turns the soft "Readiness gate" in paper-response/references/qa-checklist.md
 * into an enforceable check. Given a response tracker (one record per reviewer
 * comment, in the shape defined by references/action-mapping.md), it classifies
 * each comment and the whole package into:
 *   ready_to_submit | draft_with_placeholders | needs_author_input | blocked
 * and exits non-zero unless the package is ready_to_submit. This is the
 * rebuttal-safety-gate analogue of verify-refs.ts for the response cycle:
 * a declared readiness can only be made worse by the evidence, never better,
 * so an agent cannot label a package ready_to_submit while placeholders,
 * missing locations, blocking items, or untraceable comments remain.
 *
 * Usage:
 *   response-gate.ts tracker.json           classify a response tracker
 *   response-gate.ts tracker.json --json     print full JSON verdict
 *   response-gate.ts --classify cases.json   classify case batch (no IO side effects) — for tests
 *
 * Tracker shape: a JSON array of comment records, or { "comments": [...] }.
 * Exit: 0 when ready_to_submit, 1 otherwise (3 on usage/IO error).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

type Readiness = "ready_to_submit" | "draft_with_placeholders" | "needs_author_input" | "blocked";

interface Comment {
  comment_id?: string;
  action?: string;
  readiness?: string;
  risk_level?: string;
  manuscript_location?: string;
  has_response?: boolean;
  unresolved?: boolean;
}

interface CommentVerdict {
  comment_id: string;
  readiness: Readiness;
  issues: string[];
}

interface PackageVerdict {
  readiness: Readiness;
  counts: Record<Readiness, number>;
  comments: CommentVerdict[];
}

const RANK: Record<Readiness, number> = {
  ready_to_submit: 0,
  draft_with_placeholders: 1,
  needs_author_input: 2,
  blocked: 3,
};

// Actions (from action-mapping.md) that claim a manuscript change and therefore
// require a manuscript_location; DISAGREE / OUT_OF_SCOPE argue without changing
// the manuscript, so they need no location.
const CHANGE_ACTIONS = new Set([
  "ACCEPT_TEXT",
  "ACCEPT_ANALYSIS",
  "ACCEPT_EXPERIMENT",
  "ACCEPT_FIGURE",
  "CLARIFY_EXISTING",
  "ADD_CITATION",
  "SOFTEN_CLAIM",
  "PARTIAL",
]);

function worst(a: Readiness, b: Readiness): Readiness {
  return RANK[a] >= RANK[b] ? a : b;
}

function asReadiness(value: string): Readiness | null {
  return value in RANK ? (value as Readiness) : null;
}

// --------------------------------------------------------------------------
// Pure classification (unit-tested via --classify)
// --------------------------------------------------------------------------

function classifyComment(c: Comment): CommentVerdict {
  const issues: string[] = [];
  let readiness: Readiness = "ready_to_submit";

  const id = (c.comment_id || "").trim();
  if (!id) {
    issues.push("MISSING_COMMENT_ID"); // untraceable comment can never be cleared
    readiness = worst(readiness, "blocked");
  }

  const action = (c.action || "").trim().toUpperCase();
  const risk = (c.risk_level || "").trim().toLowerCase();

  if (action === "BLOCKING" || risk === "blocking") {
    issues.push("BLOCKING_ITEM");
    readiness = worst(readiness, "blocked");
  }

  if (action === "AUTHOR_INPUT_NEEDED") {
    issues.push("AUTHOR_INPUT_NEEDED");
    readiness = worst(readiness, "needs_author_input");
  }

  const hasResponse = c.has_response !== false; // default true unless explicitly false
  if (!hasResponse && !c.unresolved) {
    issues.push("NO_RESPONSE");
    readiness = worst(readiness, "draft_with_placeholders");
  }
  if (c.unresolved) {
    issues.push("UNRESOLVED");
    readiness = worst(readiness, "draft_with_placeholders");
  }

  const location = (c.manuscript_location || "").trim();
  if (CHANGE_ACTIONS.has(action) && !location) {
    issues.push("CLAIMED_CHANGE_NO_LOCATION"); // guards against fabricated compliance
    readiness = worst(readiness, "draft_with_placeholders");
  }

  // A declared readiness can only make the verdict worse, never better.
  const declared = asReadiness((c.readiness || "").trim().toLowerCase());
  if (declared) readiness = worst(readiness, declared);

  return { comment_id: id || "(missing-id)", readiness, issues };
}

function classifyPackage(comments: Comment[]): PackageVerdict {
  const verdicts = comments.map(classifyComment);
  const counts: Record<Readiness, number> = {
    ready_to_submit: 0,
    draft_with_placeholders: 0,
    needs_author_input: 0,
    blocked: 0,
  };
  let readiness: Readiness = "ready_to_submit";
  for (const v of verdicts) {
    counts[v.readiness]++;
    readiness = worst(readiness, v.readiness);
  }
  // An empty package addresses no comment; it is not submittable.
  if (comments.length === 0) readiness = "draft_with_placeholders";
  return { readiness, counts, comments: verdicts };
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
  console.log(`Usage: npx tsx scripts/response-gate.ts <tracker.json> [options]

  <tracker.json>      response tracker: JSON array of comment records, or { comments: [...] }
  --json              print the full JSON verdict
  --classify <json>   classify a case batch [{ name, comments }] — for tests
  -h, --help          show help

Exit: 0 when ready_to_submit, 1 otherwise.`);
}

function main(): number {
  if (values.help) {
    printHelp();
    return 0;
  }

  // Classify-only mode: a batch of named packages, deterministic, no side effects.
  if (values.classify) {
    const cases = JSON.parse(readFileSync(resolve(values.classify), "utf8")) as {
      name: string;
      comments: Comment[];
    }[];
    const out = cases.map((c) => ({ name: c.name, ...classifyPackage(c.comments ?? []) }));
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
    console.error(`Error: tracker not found: ${path}`);
    return 3;
  }

  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const comments: Comment[] = Array.isArray(parsed) ? parsed : (parsed.comments ?? []);
  const verdict = classifyPackage(comments);

  if (values.json) {
    console.log(JSON.stringify(verdict, null, 2));
  } else {
    console.log(`Response package readiness — ${path}`);
    console.log("=".repeat(56));
    console.log(
      `  ${comments.length} comment(s) | ready ${verdict.counts.ready_to_submit} | ` +
        `placeholder ${verdict.counts.draft_with_placeholders} | ` +
        `author_input ${verdict.counts.needs_author_input} | blocked ${verdict.counts.blocked}`
    );
    console.log(`  package: ${verdict.readiness.toUpperCase()}`);
    const flagged = verdict.comments.filter((v) => v.readiness !== "ready_to_submit");
    if (flagged.length) {
      console.log(`\nFlagged:`);
      for (const v of flagged) console.log(`  [${v.readiness}] ${v.comment_id} — ${v.issues.join(", ")}`);
    } else {
      console.log(`\nAll comments ready_to_submit.`);
    }
  }

  return verdict.readiness === "ready_to_submit" ? 0 : 1;
}

try {
  process.exit(main());
} catch (error: any) {
  console.error(`Error: ${error.message}`);
  process.exit(3);
}
