#!/usr/bin/env npx tsx
/**
 * init-review-panel.ts — Create or update .paper-context/review-panel.yaml
 *
 * Usage:
 *   npx tsx scripts/init-review-panel.ts <project-dir> [--default|--disable] [--force] [--print]
 *
 * Options:
 *   --default   write the built-in default panel (MiniMax + MiMo + 3 lenses) [default action]
 *   --disable   write { enabled: false }
 *   --force     overwrite an existing review-panel.yaml
 *   --print     print YAML to stdout instead of writing
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import YAML from "yaml";

const DEFAULT_PANEL = {
  enabled: true,
  endpoints: {
    minimax: {
      base_url: "https://api.minimaxi.com/anthropic",
      model: "MiniMax-M3",
      auth_env: "MINIMAX_KEY",
      max_tokens: 800,
      output: "standard",
    },
    mimo: {
      base_url: "https://token-plan-cn.xiaomimimo.com/anthropic",
      model: "mimo-v2.5-pro",
      auth_env: "MIMO_KEY",
      max_tokens: 1500,
      output: "thinking-first",
    },
  },
  lenses: {
    rigor: "逻辑严谨 / 夸大表述",
    citation: "引用真实 / 数据支撑",
    completeness: "结构完整 / 格式",
  },
  panel: [
    { endpoint: "minimax", lens: "rigor", weight: 2, veto: false },
    { endpoint: "mimo", lens: "citation", weight: 1, veto: true },
    { endpoint: "minimax", lens: "completeness", weight: 1, veto: false },
  ],
  verdict: { rule: "weighted", max_rounds: 2 },
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    default: { type: "boolean" },
    disable: { type: "boolean" },
    force: { type: "boolean" },
    print: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

function printHelp(): void {
  console.log(`Usage: npx tsx scripts/init-review-panel.ts <project-dir> [options]

Options:
  --default   write the built-in default panel (default action)
  --disable   write { enabled: false }
  --force     overwrite an existing review-panel.yaml
  --print     print YAML to stdout instead of writing
  -h, --help  show help`);
}

if (values.help) {
  printHelp();
  process.exit(0);
}

const projectArg = positionals[0];
if (!projectArg) {
  printHelp();
  process.exit(2);
}

const projectDir = resolve(projectArg);
if (!existsSync(projectDir)) {
  console.error(`Error: project directory not found: ${projectDir}`);
  process.exit(3);
}

const config = values.disable ? { enabled: false } : DEFAULT_PANEL;
const yaml = YAML.stringify(config);

if (values.print) {
  process.stdout.write(yaml);
  process.exit(0);
}

const configPath = join(projectDir, ".paper-context", "review-panel.yaml");
if (existsSync(configPath) && !values.force) {
  console.error(`Error: ${configPath} already exists. Use --force to overwrite.`);
  process.exit(1);
}

mkdirSync(dirname(configPath), { recursive: true });
writeFileSync(configPath, yaml, "utf8");
console.log(`Wrote ${join(".paper-context", "review-panel.yaml")}`);

if (!values.disable) {
  const envNames = Object.values(DEFAULT_PANEL.endpoints).map((endpoint) => endpoint.auth_env);
  console.log("\nExport these environment variables before a review run (config stores names only):");
  for (const name of envNames) {
    console.log(`  export ${name}="…"`);
  }
  console.log("\nValidate with:");
  console.log(`  npx tsx skills/paper-review-panel/scripts/validate-review-panel.ts ${projectArg}`);
}
