#!/usr/bin/env npx tsx
/**
 * validate-review-panel.ts — Validate .paper-context/review-panel.yaml
 *
 * Usage:
 *   npx tsx scripts/validate-review-panel.ts <project-dir> [--check-env]
 *
 * Prints { config_path, status, summary, findings[] } as JSON.
 *   status: "skipped" (no file) | "passed" | "blocked".
 * Exit: 0 for skipped/passed, 1 for blocked, 2 for bad args, 3 for runtime error.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import YAML from "yaml";

type Severity = "P0" | "P1";

interface Finding {
  severity: Severity;
  code: string;
  blocking: boolean;
  target: string;
  message: string;
  required_action: string;
}

const SECRET_RE =
  /(sk-[A-Za-z0-9_-]{16,}|tp-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY)/;
const ENV_NAME_RE = /^[A-Z_][A-Z0-9_]*$/;
const VALID_OUTPUT = new Set(["standard", "thinking-first"]);

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "check-env": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

function printHelp(): void {
  console.log(`Usage: npx tsx scripts/validate-review-panel.ts <project-dir> [--check-env]

Validates .paper-context/review-panel.yaml.
  --check-env   also warn when a referenced auth_env variable is not exported
  -h, --help    show help`);
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
const configPath = join(projectDir, ".paper-context", "review-panel.yaml");

const findings: Finding[] = [];
function add(
  severity: Severity,
  code: string,
  target: string,
  message: string,
  required_action: string
): void {
  findings.push({ severity, code, blocking: severity === "P0", target, message, required_action });
}

function isPositiveInt(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
function isPositiveNumber(value: unknown): boolean {
  return typeof value === "number" && value > 0;
}

function emit(status: "skipped" | "passed" | "blocked"): never {
  const summary = {
    p0: findings.filter((f) => f.severity === "P0").length,
    p1: findings.filter((f) => f.severity === "P1").length,
  };
  console.log(
    JSON.stringify(
      { config_path: ".paper-context/review-panel.yaml", status, summary, findings },
      null,
      2
    )
  );
  process.exit(status === "blocked" ? 1 : 0);
}

try {
  if (!existsSync(configPath)) {
    emit("skipped");
  }

  const raw = readFileSync(configPath, "utf8");

  if (SECRET_RE.test(raw)) {
    add(
      "P0",
      "SECRET_IN_CONFIG",
      "review-panel.yaml",
      "A plaintext key-like value appears in the config.",
      "Remove the secret; store only the env-var name in auth_env and export the key."
    );
  }

  let config: any;
  try {
    config = YAML.parse(raw);
  } catch (error: any) {
    add(
      "P0",
      "REVIEW_PANEL_INVALID_YAML",
      "review-panel.yaml",
      `Config is not valid YAML: ${error.message}`,
      "Fix the YAML syntax."
    );
    emit("blocked");
  }
  config = config ?? {};

  if (typeof config.enabled !== "boolean") {
    add(
      "P0",
      "ENABLED_NOT_BOOLEAN",
      "enabled",
      "`enabled` is missing or not a boolean.",
      "Set enabled: true or false."
    );
    emit("blocked");
  }

  if (config.enabled === false) {
    emit(findings.some((f) => f.blocking) ? "blocked" : "passed");
  }

  // enabled === true below.
  const endpoints =
    config.endpoints && typeof config.endpoints === "object" ? config.endpoints : {};
  const endpointIds = Object.keys(endpoints);
  if (endpointIds.length === 0) {
    add(
      "P0",
      "ENDPOINTS_EMPTY",
      "endpoints",
      "Review is enabled but no endpoints are defined.",
      "Add at least one endpoint with base_url, model, auth_env."
    );
  }
  for (const id of endpointIds) {
    const ep = endpoints[id] ?? {};
    for (const field of ["base_url", "model", "auth_env"]) {
      if (typeof ep[field] !== "string" || !ep[field].trim()) {
        add(
          "P0",
          "ENDPOINT_FIELD_MISSING",
          `endpoints.${id}.${field}`,
          `Endpoint "${id}" is missing required field "${field}".`,
          `Set a non-empty ${field}.`
        );
      }
    }
    if (typeof ep.auth_env === "string" && ep.auth_env.trim() && !ENV_NAME_RE.test(ep.auth_env)) {
      add(
        "P0",
        "AUTH_ENV_INVALID_NAME",
        `endpoints.${id}.auth_env`,
        `auth_env "${ep.auth_env}" is not a valid environment-variable name.`,
        "Use an env-var name like MINIMAX_KEY; never put the key value here."
      );
    }
    if (ep.output !== undefined && !VALID_OUTPUT.has(String(ep.output))) {
      add(
        "P0",
        "ENDPOINT_OUTPUT_INVALID",
        `endpoints.${id}.output`,
        `output "${ep.output}" is invalid.`,
        "Use output: standard or thinking-first."
      );
    }
  }

  const lenses = config.lenses && typeof config.lenses === "object" ? config.lenses : {};
  const lensIds = Object.keys(lenses);
  if (lensIds.length === 0) {
    add(
      "P0",
      "LENSES_EMPTY",
      "lenses",
      "Review is enabled but no lenses are defined.",
      "Add at least one lens (e.g. rigor, citation, completeness)."
    );
  }

  const panel = Array.isArray(config.panel) ? config.panel : [];
  if (panel.length === 0) {
    add(
      "P0",
      "PANEL_EMPTY",
      "panel",
      "Review is enabled but the panel is empty.",
      "Add at least one reviewer pairing an endpoint with a lens."
    );
  }
  panel.forEach((row: any, index: number) => {
    const at = `panel[${index}]`;
    if (!endpointIds.includes(row?.endpoint)) {
      add(
        "P0",
        "PANEL_UNKNOWN_ENDPOINT",
        at,
        `Panel reviewer references unknown endpoint "${row?.endpoint}".`,
        "Use an endpoint id defined under endpoints."
      );
    }
    if (!lensIds.includes(row?.lens)) {
      add(
        "P0",
        "PANEL_UNKNOWN_LENS",
        at,
        `Panel reviewer references unknown lens "${row?.lens}".`,
        "Use a lens id defined under lenses."
      );
    }
    if (row?.weight !== undefined && !isPositiveNumber(row.weight)) {
      add(
        "P0",
        "PANEL_WEIGHT_INVALID",
        `${at}.weight`,
        `weight "${row.weight}" must be a positive number.`,
        "Set weight to a positive number or omit it (defaults to 1)."
      );
    }
  });

  const verdict = config.verdict && typeof config.verdict === "object" ? config.verdict : {};
  if (verdict.rule !== undefined && verdict.rule !== "weighted") {
    add(
      "P0",
      "VERDICT_RULE_INVALID",
      "verdict.rule",
      `verdict.rule "${verdict.rule}" is not supported.`,
      "Use verdict.rule: weighted (only supported value)."
    );
  }
  if (verdict.max_rounds !== undefined && !isPositiveInt(verdict.max_rounds)) {
    add(
      "P0",
      "VERDICT_MAX_ROUNDS_INVALID",
      "verdict.max_rounds",
      `max_rounds "${verdict.max_rounds}" must be a positive integer.`,
      "Set max_rounds to a positive integer or omit it (defaults to 2)."
    );
  }

  if (values["check-env"]) {
    for (const id of endpointIds) {
      const envName = endpoints[id]?.auth_env;
      if (typeof envName === "string" && ENV_NAME_RE.test(envName) && !process.env[envName]) {
        add(
          "P1",
          "AUTH_ENV_NOT_SET",
          `endpoints.${id}.auth_env`,
          `Environment variable "${envName}" is not currently set.`,
          `Export ${envName} before running a review.`
        );
      }
    }
  }

  emit(findings.some((f) => f.blocking) ? "blocked" : "passed");
} catch (error: any) {
  console.error(`Error: ${error.message}`);
  process.exit(3);
}
