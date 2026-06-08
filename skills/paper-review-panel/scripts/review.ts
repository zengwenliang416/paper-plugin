#!/usr/bin/env npx tsx
/**
 * review.ts — Run the multi-model, multi-perspective review panel.
 *
 * Usage:
 *   review <project-dir> --file <path>            review a file's contents
 *   review <project-dir> --text "<text>"          review inline text
 *   review <project-dir> --aggregate <json>       aggregate-only (no API calls)
 *   [--dry-run] [--ledger] [--gate <name>]
 *
 * Reads <project-dir>/.paper-context/review-panel.yaml and per-endpoint keys
 * from the environment (each endpoint's auth_env). Prints a GateDecision JSON.
 * Exit: 0 for pass/revise/disabled, 1 for block, 2 bad args, 3 runtime error.
 *
 * Decision model (deterministic, testable via --aggregate):
 *   - a veto reviewer returning "block" forces block;
 *   - else weighted: block if blockW > passW; revise if any non-pass; else pass.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import YAML from "yaml";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = dirname(SCRIPT_DIR);
const LENS_DIR = join(SKILL_DIR, "references", "review-lenses");
const ANTHROPIC_VERSION = "2023-06-01";
const TIMEOUT_MS = 90_000;

type Decision = "pass" | "revise" | "block" | "error";

interface Verdict {
  endpoint: string;
  model: string;
  lens: string;
  weight: number;
  veto: boolean;
  decision: Decision;
  excerpt: string;
  error?: string;
}

interface GateDecision {
  result: "pass" | "revise" | "block" | "error";
  veto_triggered: boolean;
  tally: { passW: number; reviseW: number; blockW: number; errored: number };
  reviewers: Verdict[];
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    file: { type: "string" },
    text: { type: "string" },
    aggregate: { type: "string" },
    "dry-run": { type: "boolean" },
    ledger: { type: "boolean" },
    gate: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

function printHelp(): void {
  console.log(`Usage: npx tsx scripts/review.ts <project-dir> [options]

Options:
  --file <path>        review the contents of a file
  --text "<text>"      review inline text
  --aggregate <json>   aggregate a verdicts JSON file (no API calls)
  --dry-run            print which reviewers would be called, make no calls
  --ledger             append the decision to .paper-context/ledgers/review.jsonl
  --gate <name>        label for the run (default: ad-hoc)
  -h, --help           show help`);
}

if (values.help) {
  printHelp();
  process.exit(0);
}

function isPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && value > 0 ? value : null;
}

function aggregate(verdicts: Verdict[]): GateDecision {
  const effective = verdicts.filter((v) => v.decision !== "error");
  const errored = verdicts.length - effective.length;
  const weightOf = (predicate: (v: Verdict) => boolean): number =>
    effective.filter(predicate).reduce((sum, v) => sum + (isPositiveNumber(v.weight) ?? 1), 0);

  const passW = weightOf((v) => v.decision === "pass");
  const reviseW = weightOf((v) => v.decision === "revise");
  const blockW = weightOf((v) => v.decision === "block");
  const vetoTriggered = effective.some((v) => v.veto && v.decision === "block");

  let result: GateDecision["result"];
  if (effective.length === 0) {
    result = "error";
  } else if (vetoTriggered) {
    result = "block";
  } else if (blockW > passW) {
    result = "block";
  } else if (reviseW + blockW > 0) {
    result = "revise";
  } else {
    result = "pass";
  }

  return {
    result,
    veto_triggered: vetoTriggered,
    tally: { passW, reviseW, blockW, errored },
    reviewers: verdicts,
  };
}

function parseDecision(text: string): Decision {
  const matches = [...text.matchAll(/(通过|需修改|打回|reject|revise|block|pass)/gi)];
  if (matches.length === 0) return "revise";
  const last = matches[matches.length - 1][0].toLowerCase();
  if (/打回|reject|block/.test(last)) return "block";
  if (/需修改|revise/.test(last)) return "revise";
  return "pass";
}

function extractText(data: any): string {
  const blocks = Array.isArray(data?.content) ? data.content : [];
  const text = blocks
    .filter((b: any) => b?.type === "text" && typeof b.text === "string")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
  if (text) return text;
  // Fallback for truncated thinking-first endpoints (e.g. MiMo): use thinking.
  return blocks
    .filter((b: any) => b?.type === "thinking" && typeof b.thinking === "string")
    .map((b: any) => b.thinking)
    .join("\n")
    .trim();
}

function loadLensPrompt(lens: string, target: string, lensDesc: string): string {
  const path = join(LENS_DIR, `${lens}.md`);
  if (existsSync(path)) {
    const md = readFileSync(path, "utf8");
    const idx = md.indexOf("\n---\n");
    const template = idx >= 0 ? md.slice(idx + 5) : md;
    if (template.includes("{{TARGET}}")) return template.replace("{{TARGET}}", target);
    return `${template.trim()}\n\n【待审文本】\n${target}`;
  }
  return `你是严格的论文评审专家。只从【${lensDesc || lens}】这一个角度审查下面文本，逐条列出问题（原文片段 → 为什么有问题），中文、简洁、不要输出思考过程，最后一行只给结论：通过 / 需修改 / 打回。\n\n【待审文本】\n${target}`;
}

async function callReviewer(
  row: any,
  endpoint: any,
  lensDesc: string,
  target: string
): Promise<Verdict> {
  const base: Verdict = {
    endpoint: row.endpoint,
    model: endpoint?.model ?? "unknown",
    lens: row.lens,
    weight: isPositiveNumber(row.weight) ?? 1,
    veto: row.veto === true,
    decision: "error",
    excerpt: "",
  };

  const key = endpoint?.auth_env ? process.env[endpoint.auth_env] : undefined;
  if (!key) {
    return { ...base, error: `env ${endpoint?.auth_env ?? "?"} not set` };
  }

  const prompt = loadLensPrompt(row.lens, target, lensDesc);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${endpoint.base_url}/v1/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: endpoint.model,
        max_tokens: isPositiveNumber(endpoint.max_tokens) ?? 800,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ...base, error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    const text = extractText(data);
    if (!text) return { ...base, error: "empty response" };
    return { ...base, decision: parseDecision(text), excerpt: text.slice(0, 400) };
  } catch (error: any) {
    const reason = error?.name === "AbortError" ? `timeout after ${TIMEOUT_MS}ms` : error.message;
    return { ...base, error: reason };
  } finally {
    clearTimeout(timer);
  }
}

function writeLedger(projectDir: string, gate: string, decision: GateDecision): void {
  const path = join(projectDir, ".paper-context", "ledgers", "review.jsonl");
  mkdirSync(dirname(path), { recursive: true });
  const row = {
    gate,
    result: decision.result,
    veto_triggered: decision.veto_triggered,
    tally: decision.tally,
    reviewers: decision.reviewers.map((v) => ({
      endpoint: v.endpoint,
      lens: v.lens,
      decision: v.decision,
      ...(v.error ? { error: v.error } : {}),
    })),
  };
  appendFileSync(path, JSON.stringify(row) + "\n", "utf8");
}

async function main(): Promise<number> {
  const projectArg = positionals[0];
  if (!projectArg) {
    printHelp();
    return 2;
  }
  const projectDir = resolve(projectArg);

  // Aggregate-only mode: deterministic, no API calls (testing + human-in-loop).
  if (values.aggregate) {
    const verdicts = JSON.parse(readFileSync(resolve(values.aggregate), "utf8")) as Verdict[];
    const decision = aggregate(verdicts);
    console.log(JSON.stringify(decision, null, 2));
    return decision.result === "block" ? 1 : 0;
  }

  const configPath = join(projectDir, ".paper-context", "review-panel.yaml");
  if (!existsSync(configPath)) {
    console.error(`Error: ${configPath} not found. Run init-review-panel.ts first.`);
    return 3;
  }
  const config = YAML.parse(readFileSync(configPath, "utf8")) ?? {};
  if (config.enabled !== true) {
    console.log(JSON.stringify({ result: "disabled", reviewers: [] }, null, 2));
    return 0;
  }

  let target = "";
  if (values.file) {
    const filePath = resolve(values.file);
    if (!existsSync(filePath)) {
      console.error(`Error: file not found: ${filePath}`);
      return 3;
    }
    target = readFileSync(filePath, "utf8");
  } else if (values.text) {
    target = values.text;
  } else {
    console.error("Error: provide --file <path> or --text <text>.");
    return 2;
  }

  const endpoints = config.endpoints ?? {};
  const lenses = config.lenses ?? {};
  const panel = Array.isArray(config.panel) ? config.panel : [];
  const gate = values.gate || "ad-hoc";

  if (values["dry-run"]) {
    const plan = panel.map((row: any) => ({
      endpoint: row.endpoint,
      model: endpoints[row.endpoint]?.model ?? "unknown",
      lens: row.lens,
      weight: row.weight ?? 1,
      veto: row.veto === true,
    }));
    console.log(JSON.stringify({ gate, dry_run: true, target_chars: target.length, reviewers: plan }, null, 2));
    return 0;
  }

  const verdicts = await Promise.all(
    panel.map((row: any) =>
      callReviewer(row, endpoints[row.endpoint], lenses[row.lens] ?? "", target)
    )
  );
  const decision = aggregate(verdicts);
  console.log(JSON.stringify({ gate, ...decision }, null, 2));

  if (values.ledger) writeLedger(projectDir, gate, decision);

  return decision.result === "block" ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(3);
  });
