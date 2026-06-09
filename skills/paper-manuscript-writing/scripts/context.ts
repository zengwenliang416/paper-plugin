#!/usr/bin/env npx tsx
/**
 * context.ts — Project-local context manager for paper/thesis projects.
 *
 * Subcommands:
 *   init <project-dir>       Create .paper-context overlay
 *   load <project-dir>       Print normalized context
 *   update <project-dir>     Refresh manifest, indexes, and CURRENT.md
 *   validate <project-dir>   Run pre-write/pre-export/pre-archive gates
 *   snapshot <project-dir>   Write a point-in-time context snapshot
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import YAML from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_VERSION = 1;
const DEFAULT_STATE = "INITIALIZED";
const HIGH_RISK_CLAIM_RE =
  /(实验结果表明|验证了|显著提升|稳定运行|实测|真实|优化后|准确率|通过测试|result[s]? show|significant|accuracy|validated|outperform)/i;

const VALID_GATES = new Set(["pre-write", "pre-export", "pre-archive"]);
const SUPPORT_OK_PRE_WRITE = new Set([
  "supported",
  "verified",
  "partial",
  "content_verified",
  "reproduction_verified",
  "figure_source_verified",
]);
const SUPPORT_OK_PRE_EXPORT = new Set([
  "supported",
  "verified",
  "content_verified",
  "reproduction_verified",
  "figure_source_verified",
]);

type Gate = "pre-write" | "pre-export" | "pre-archive";
type Severity = "P0" | "P1" | "P2";

interface Finding {
  severity: Severity;
  code: string;
  blocking: boolean;
  target: string;
  message: string;
  required_action: string;
}

interface ValidationResult {
  gate: Gate;
  status: "passed" | "blocked" | "forced";
  summary: Record<"p0" | "p1" | "p2", number>;
  findings: Finding[];
}

interface SnapshotFile {
  path: string;
  sha256: string;
  size_bytes: number;
  mtime_ms: number;
}

interface Snapshot {
  schema_version: number;
  generated_at: string;
  project_id: string;
  context_state: string;
  files: SnapshotFile[];
  latest_output: SnapshotFile | null;
  state_hash: string;
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    format: { type: "string" },
    gate: { type: "string" },
    label: { type: "string" },
    force: { type: "boolean" },
    reason: { type: "string" },
    "allow-warnings": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

function printHelp(): void {
  console.log(`Usage: npx tsx scripts/context.ts <command> <project-dir> [options]

Commands:
  init <project-dir>       Create or refresh .paper-context/
  load <project-dir>       Print normalized context
  update <project-dir>     Refresh manifest, indexes, and CURRENT.md
  validate <project-dir>   Run context quality gates
  snapshot <project-dir>   Write a context snapshot

Options:
  --format json|yaml|md    Output format for load (default: md)
  --gate <name>            pre-write, pre-export, or pre-archive
  --label <label>          Snapshot label
  --force                  Allow P0 validation override
  --reason <text>          Required reason for P0 override
  --allow-warnings         Reserve flag for callers that distinguish P1 warnings
  -h, --help               Show help

Examples:
  npx tsx scripts/context.ts init ./my-thesis
  npx tsx scripts/context.ts load ./my-thesis --format json
  npx tsx scripts/context.ts validate ./my-thesis --gate pre-export
  npx tsx scripts/context.ts snapshot ./my-thesis --label before-export`);
}

if (values.help) {
  printHelp();
  process.exit(0);
}

const command = positionals[0];
const projectArg = positionals[1];

if (!command || !projectArg) {
  printHelp();
  process.exit(2);
}

const projectDir = resolve(projectArg);
const contextDir = join(projectDir, ".paper-context");

if (!existsSync(projectDir)) {
  console.error(`Error: project directory not found: ${projectDir}`);
  process.exit(3);
}

function nowIso(): string {
  return new Date().toISOString();
}

function rel(path: string): string {
  return normalizePath(relative(projectDir, path) || ".");
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function writeText(path: string, text: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, text, "utf8");
}

function writeJson(path: string, data: unknown): void {
  writeText(path, JSON.stringify(data, null, 2) + "\n");
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readText(path)) as T;
}

function readYaml<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  const parsed = YAML.parse(readText(path));
  return (parsed ?? fallback) as T;
}

function writeYaml(path: string, data: unknown): void {
  writeText(path, YAML.stringify(data));
}

function fileHash(path: string): string {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return `sha256:${hash.digest("hex")}`;
}

function fileInfo(path: string): SnapshotFile {
  const stat = statSync(path);
  return {
    path: rel(path),
    sha256: fileHash(path),
    size_bytes: stat.size,
    mtime_ms: Math.round(stat.mtimeMs),
  };
}

function listFiles(root: string, predicate: (path: string) => boolean): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      const isContextCache = entry.name === "cache" && basename(dirname(path)) === ".paper-context";
      if ([".git", "node_modules", ".tmp-export", "_archive"].includes(entry.name) || isContextCache) {
        continue;
      }
      out.push(...listFiles(path, predicate));
    } else if (entry.isFile() && predicate(path)) {
      out.push(path);
    }
  }
  return out.sort();
}

function readThesisYaml(): Record<string, any> | null {
  const yamlPath = join(projectDir, "thesis.yaml");
  if (!existsSync(yamlPath)) return null;
  return YAML.parse(readText(yamlPath)) ?? {};
}

function chapterFiles(config = readThesisYaml()): string[] {
  const contentDir = join(projectDir, "content");
  if (Array.isArray(config?.chapters) && config.chapters.length > 0) {
    return config.chapters.map((name: unknown) => String(name));
  }
  if (!existsSync(contentDir)) return [];
  return readdirSync(contentDir)
    .filter((name) => name.endsWith(".md"))
    .sort();
}

function latestOutput(): string | null {
  const outputDir = join(projectDir, "output");
  if (!existsSync(outputDir)) return null;
  const outputs = readdirSync(outputDir)
    .filter((name) => name.endsWith(".docx") || name.endsWith(".pdf"))
    .map((name) => join(outputDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return outputs[0] ?? null;
}

function buildSnapshot(): Snapshot {
  const config = readThesisYaml();
  const files: SnapshotFile[] = [];
  const directFiles = [
    "thesis.yaml",
    ".thesis.json",
    "assets/refs.bib",
    "format/reference.docx",
    "format/filter.lua",
    "format/citation.csl",
  ];

  for (const file of directFiles) {
    const path = join(projectDir, file);
    if (existsSync(path) && statSync(path).isFile()) files.push(fileInfo(path));
  }

  for (const filename of chapterFiles(config)) {
    const path = join(projectDir, "content", filename);
    if (existsSync(path) && statSync(path).isFile()) files.push(fileInfo(path));
  }

  const latest = latestOutput();
  const payload = {
    files: files.map((file) => `${file.path}:${file.sha256}:${file.mtime_ms}`),
    latest_output: latest ? fileInfo(latest) : null,
  };
  const stateHash = `sha256:${createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")}`;

  return {
    schema_version: SCHEMA_VERSION,
    generated_at: nowIso(),
    project_id: projectId(),
    context_state: currentContextState(),
    files,
    latest_output: latest ? fileInfo(latest) : null,
    state_hash: stateHash,
  };
}

function currentContextState(): string {
  const contextPath = join(contextDir, "context.yaml");
  const context = readYaml<Record<string, any>>(contextPath, {});
  return String(context.context_state || DEFAULT_STATE);
}

function projectId(): string {
  const contextPath = join(contextDir, "context.yaml");
  const context = readYaml<Record<string, any>>(contextPath, {});
  if (typeof context.project_id === "string" && context.project_id.trim()) {
    return context.project_id;
  }
  const base = basename(projectDir).toLowerCase().replace(/[^a-z0-9]+/g, "-") || "paper";
  return `paperctx_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_${base}`;
}

function ensureContextDirs(): void {
  for (const dir of [
    contextDir,
    join(contextDir, "registry"),
    join(contextDir, "ledgers"),
    join(contextDir, "indexes"),
    join(contextDir, "logs"),
    join(contextDir, "runs"),
    join(contextDir, "checkpoints"),
    join(contextDir, "diffs"),
    join(contextDir, "snapshots"),
    join(contextDir, "cache", "extracted-text"),
    join(contextDir, "cache", "thumbnails"),
    join(contextDir, "cache", "ooxml-scan"),
    join(contextDir, "cache", "docx-renders"),
  ]) {
    ensureDir(dir);
  }
}

function sourceKind(path: string): string {
  const ext = extname(path).toLowerCase();
  if (ext === ".docx" || ext === ".doc") return "docx";
  if (ext === ".pdf") return "pdf";
  if (ext === ".md") return "md";
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".tif", ".tiff"].includes(ext)) return "image";
  if ([".csv", ".tsv", ".xlsx", ".json", ".yaml", ".yml"].includes(ext)) return "data";
  if ([".ts", ".tsx", ".js", ".py", ".java", ".go", ".rs", ".m"].includes(ext)) return "code";
  return ext.replace(/^\./, "") || "file";
}

function registerSources(): any[] {
  const sources: any[] = [];
  let counter = 1;
  const add = (path: string, role: string, note = "") => {
    if (!existsSync(path) || !statSync(path).isFile()) return;
    sources.push({
      source_id: `SRC${String(counter++).padStart(3, "0")}`,
      kind: sourceKind(path),
      role,
      path: rel(path),
      absolute_path_redacted: true,
      sha256: fileHash(path),
      size_bytes: statSync(path).size,
      mtime_ns: Math.round(statSync(path).mtimeMs * 1_000_000),
      content_status: "indexed",
      notes: note,
    });
  };

  add(join(projectDir, "thesis.yaml"), "authority", "project metadata and chapter order");
  add(join(projectDir, ".thesis.json"), "derived", "export/version state");
  for (const filename of chapterFiles()) add(join(projectDir, "content", filename), "authority", "editable manuscript source");
  add(join(projectDir, "assets", "refs.bib"), "derived", "bibliography file");
  add(join(projectDir, "format", "reference.docx"), "authority", "school or project reference template");
  add(join(projectDir, "format", "filter.lua"), "derived", "project export filter");
  return sources;
}

function registerArtifacts(): any[] {
  const artifacts: any[] = [];
  let counter = 1;
  const outDir = join(projectDir, "output");
  if (!existsSync(outDir)) return artifacts;
  for (const name of readdirSync(outDir).sort()) {
    const path = join(outDir, name);
    if (!statSync(path).isFile()) continue;
    artifacts.push({
      artifact_id: `ART${String(counter++).padStart(3, "0")}`,
      kind: extname(name).replace(/^\./, "") || "file",
      path: rel(path),
      sha256: fileHash(path),
      size_bytes: statSync(path).size,
      mtime_ns: Math.round(statSync(path).mtimeMs * 1_000_000),
      role: name.endsWith(".docx") ? "docx-output" : "output",
    });
  }
  return artifacts;
}

function writeDefaultLedgers(): void {
  const files: Record<string, string> = {
    "registry/claims.tsv":
      "claim_id\tsection\tclaim_text\tclaim_type\tsupport_status\tevidence_ids\tsource_refs\trisk\n",
    "registry/issues.tsv":
      "issue_id\tseverity\tcode\ttarget\tstatus\trequired_action\n",
    "ledgers/evidence.tsv":
      "evidence_id\tevidence_type\tsource_path\tverification_action\tstatus\tnotes\n",
    "ledgers/figures.tsv":
      "figure_id\ttitle\tchapter\tsource_type\tsource_path\tai_generated\tplaceholder\tevidence_status\tbody_reference\taction\n",
    "ledgers/citations.tsv":
      "old_no\tnew_no\ttitle\tsource_type\tverification_source\tverification_status\tcitation_locations\taction\n",
    "ledgers/docx.tsv":
      "output_path\tpackage_valid\trender_checked\tstatus\trenderer\tpage_count\tpng_dir\tpdf_path\treviewed_pages\treviewer\tchecked_at\tnotes\n",
    "ledgers/reviewer-comments.jsonl": "",
  };
  for (const [file, content] of Object.entries(files)) {
    const path = join(contextDir, file);
    if (!existsSync(path)) writeText(path, content);
  }
  const dataPath = join(contextDir, "ledgers", "data-availability.yaml");
  if (!existsSync(dataPath)) writeYaml(dataPath, { schema_version: SCHEMA_VERSION, status: "not_assessed" });
  const peoplePath = join(contextDir, "registry", "people.yaml");
  if (!existsSync(peoplePath)) writeYaml(peoplePath, { schema_version: SCHEMA_VERSION, people: [] });
}

function writeIndexes(sources: any[], artifacts: any[]): void {
  const byPath: Record<string, string[]> = {};
  const byHash: Record<string, string[]> = {};
  for (const item of [...sources, ...artifacts]) {
    const id = item.source_id || item.artifact_id;
    if (!id) continue;
    if (item.path) byPath[item.path] = [...(byPath[item.path] ?? []), id];
    if (item.sha256) byHash[item.sha256] = [...(byHash[item.sha256] ?? []), id];
  }
  writeJson(join(contextDir, "indexes", "by-path.json"), byPath);
  writeJson(join(contextDir, "indexes", "by-hash.json"), byHash);
  const anchorPath = join(contextDir, "indexes", "by-anchor.json");
  if (!existsSync(anchorPath)) writeJson(anchorPath, {});
}

function appendEvent(type: string, detail: Record<string, unknown>): void {
  const path = join(contextDir, "logs", "events.jsonl");
  ensureDir(dirname(path));
  writeFileSync(
    path,
    JSON.stringify({
      event_id: `EVT-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`,
      at: nowIso(),
      type,
      ...detail,
    }) + "\n",
    { flag: "a", encoding: "utf8" }
  );
}

function buildVersions(versionId = "v0.1-intake"): any {
  const existing = readYaml<Record<string, any>>(join(contextDir, "versions.yaml"), {});
  if (existing.schema_version) return existing;
  return {
    schema_version: SCHEMA_VERSION,
    current_version: versionId,
    active_version: versionId,
    next_version: "",
    dirty: false,
    versions: [
      {
        id: versionId,
        type: "context",
        status: "active",
        role: "material inventory and source hierarchy",
        created_at: nowIso(),
        updated_at: nowIso(),
        checkpoint: `checkpoints/${versionId}.md`,
        thesis_state_tag: "",
        changed_files: [],
        ledger_refs: [],
      },
    ],
  };
}

function writeCheckpoint(versionId: string, label: string): void {
  const path = join(contextDir, "checkpoints", `${versionId}.md`);
  if (existsSync(path) && label !== "version") return;
  writeText(
    path,
    `# ${versionId}\n\n- Created: ${nowIso()}\n- Label: ${label}\n- Context state: ${currentContextState()}\n- Current version: ${versionId}\n- Related run: none\n- Validation: not run\n- Remaining TODO: review project context and evidence ledgers\n`
  );
}

function updateCurrentMd(snapshot: Snapshot, versions: any): void {
  const latest = snapshot.latest_output?.path || "none";
  writeText(
    join(contextDir, "CURRENT.md"),
    `# Current Paper Context\n\n- Current version: ${versions.current_version || "unknown"}\n- Active version: ${versions.active_version || "unknown"}\n- Next version: ${versions.next_version || "none"}\n- Dirty: ${Boolean(versions.dirty)}\n- Context state: ${snapshot.context_state}\n- Editable source: content/\n- Latest output: ${latest}\n- Completed this run: context refreshed\n- Not completed: review unresolved issues in registry/issues.tsv\n- Next first action: run context validate for the intended gate\n- Risks/blockers: see registry/issues.tsv and validation findings\n- Recent run: none\n- Recent checkpoint: ${versions.active_version || "none"}\n`
  );
}

function updateManifest(snapshot: Snapshot, sources: any[], artifacts: any[], versions: any): void {
  const manifest = {
    schema_version: SCHEMA_VERSION,
    generated_at: snapshot.generated_at,
    project_id: snapshot.project_id,
    context_state: snapshot.context_state,
    current_version: versions.current_version || "",
    active_version: versions.active_version || "",
    objects: {
      sources: "registry/sources.json",
      artifacts: "registry/artifacts.json",
      claims: "registry/claims.tsv",
      issues: "registry/issues.tsv",
      versions: "versions.yaml",
    },
    counts: {
      sources: sources.length,
      artifacts: artifacts.length,
      claims: readTsv(join(contextDir, "registry", "claims.tsv")).length,
      issues: readTsv(join(contextDir, "registry", "issues.tsv")).length,
    },
    state_hash: snapshot.state_hash,
  };
  writeJson(join(contextDir, "manifest.json"), manifest);
}

function writeContextYaml(): void {
  const contextPath = join(contextDir, "context.yaml");
  const config = readThesisYaml();
  const existing = readYaml<Record<string, any>>(contextPath, {});
  const context = {
    schema_version: SCHEMA_VERSION,
    project_id: existing.project_id || projectId(),
    project_root: ".",
    path_base: "project_root",
    title: config?.title || existing.title || "",
    language: config?.language || existing.language || "zh-CN",
    primary_workflow: existing.primary_workflow || "thesis",
    context_state: existing.context_state || DEFAULT_STATE,
    canonical: {
      thesis_yaml: "../thesis.yaml",
      thesis_state: "../.thesis.json",
      reader_paper_md: "../paper.md",
      reader_source_map: "../source_map.json",
    },
    privacy: {
      store_absolute_paths: false,
      redact_user_home: true,
      allow_external_paths: "manifest_only",
    },
  };
  writeYaml(contextPath, context);
}

function runRefresh(eventType: string): Snapshot {
  ensureContextDirs();
  writeText(join(contextDir, ".gitignore"), "private.json\ncache/\n");
  writeContextYaml();
  writeDefaultLedgers();

  const sources = registerSources();
  const artifacts = registerArtifacts();
  writeJson(join(contextDir, "registry", "sources.json"), sources);
  writeJson(join(contextDir, "registry", "artifacts.json"), artifacts);
  writeIndexes(sources, artifacts);

  const snapshot = buildSnapshot();
  const versions = buildVersions();
  writeYaml(join(contextDir, "versions.yaml"), versions);
  writeCheckpoint(versions.active_version || "v0.1-intake", eventType);
  updateCurrentMd(snapshot, versions);
  updateManifest(snapshot, sources, artifacts, versions);
  appendEvent(eventType, {
    project_id: snapshot.project_id,
    state_hash: snapshot.state_hash,
    current_version: versions.current_version || "",
    active_version: versions.active_version || "",
  });
  return snapshot;
}

function readTsv(path: string): Record<string, string>[] {
  if (!existsSync(path)) return [];
  const lines = readText(path).split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split("\t").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split("\t");
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index]?.trim() ?? "";
    });
    return row;
  });
}

function addFinding(findings: Finding[], finding: Omit<Finding, "blocking">): void {
  findings.push({
    ...finding,
    blocking: finding.severity === "P0",
  });
}

function contentFiles(): string[] {
  const contentDir = join(projectDir, "content");
  if (!existsSync(contentDir)) return [];
  return listFiles(contentDir, (path) => path.endsWith(".md"));
}

function readProjectTextFiles(): { path: string; text: string }[] {
  return contentFiles().map((path) => ({ path, text: readText(path) }));
}

function highRiskClaims(): { path: string; sentence: string }[] {
  const claims: { path: string; sentence: string }[] = [];
  for (const file of readProjectTextFiles()) {
    const sentences = file.text
      .split(/(?<=[。！？.!?])|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      if (HIGH_RISK_CLAIM_RE.test(sentence)) claims.push({ path: file.path, sentence });
    }
  }
  return claims;
}

function validateClaimEvidence(findings: Finding[], gate: Gate): void {
  const highRisk = highRiskClaims();
  if (highRisk.length === 0) return;

  const claimRows = readTsv(join(contextDir, "registry", "claims.tsv"));
  const supportSet = gate === "pre-write" ? SUPPORT_OK_PRE_WRITE : SUPPORT_OK_PRE_EXPORT;
  const supported = claimRows.some((row) =>
    supportSet.has((row.support_status || "").toLowerCase()) ||
    supportSet.has((row.status || "").toLowerCase())
  );

  if (!supported) {
    const first = highRisk[0];
    addFinding(findings, {
      severity: "P0",
      code: "CLAIM_EVIDENCE_MISSING",
      target: `${rel(first.path)}#${first.sentence.slice(0, 24)}`,
      message: "High-risk claim has no supported claim ledger row.",
      required_action: "Add verified evidence to registry/claims.tsv or soften/delete the claim.",
    });
  }
}

function extractCitationNumbers(text: string): number[] {
  const out = new Set<number>();
  const re = /[\[［]([0-9０-９,\-，、\s]+)[\]］]/g;
  for (const match of text.matchAll(re)) {
    const raw = match[1].replace(/[０-９]/g, (d) => String("０１２３４５６７８９".indexOf(d)));
    for (const part of raw.split(/[，,、]/)) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        for (let n = start; n <= end; n++) out.add(n);
      } else if (/^\d+$/.test(trimmed)) {
        out.add(Number(trimmed));
      }
    }
  }
  return [...out].sort((a, b) => a - b);
}

function bibliographyCount(): number {
  const refsMd = join(projectDir, "content", "references.md");
  let count = 0;
  if (existsSync(refsMd)) {
    count += readText(refsMd)
      .split(/\r?\n/)
      .filter((line) => /^\s*(?:\[\d+\]|［\d+］|\d+[.、])/.test(line)).length;
  }
  const bib = join(projectDir, "assets", "refs.bib");
  if (existsSync(bib)) {
    count += (readText(bib).match(/@\w+\s*\{/g) || []).length;
  }
  return count;
}

function validateCitations(findings: Finding[], gate: Gate): void {
  if (gate === "pre-write") return;
  const bodyText = contentFiles()
    .filter((path) => basename(path) !== "references.md")
    .map((path) => readText(path))
    .join("\n");
  const citations = extractCitationNumbers(bodyText);
  if (citations.length === 0) return;
  const maxCitation = Math.max(...citations);
  const count = bibliographyCount();
  if (count === 0 || maxCitation > count) {
    addFinding(findings, {
      severity: "P0",
      code: "CITATION_DANGLING",
      target: `citation[${maxCitation}]`,
      message: "Body citation does not resolve to an available bibliography entry.",
      required_action: "Synchronize in-text citations with references.md or assets/refs.bib.",
    });
  }
}

function validateCitationVerification(findings: Finding[], gate: Gate): void {
  if (gate !== "pre-archive") return;
  const okStatuses = new Set([
    "verified",
    "partial",
    "replaced",
    "not_applicable",
    "not-applicable",
    "unavailable",
  ]);
  const rows = readTsv(join(contextDir, "ledgers", "citations.tsv"));
  if (rows.length === 0) return;
  const unverified = rows.filter(
    (row) => !okStatuses.has((row.verification_status || "").toLowerCase().trim())
  );
  if (unverified.length > 0) {
    addFinding(findings, {
      severity: "P0",
      code: "CITATION_NOT_VERIFIED",
      target: "ledgers/citations.tsv",
      message: `${unverified.length} citation(s) in the verification ledger are not verified (e.g. status "${unverified[0].verification_status || "empty"}").`,
      required_action:
        "Verify each reference (e.g. via paper-literature/verify-refs.ts) and set verification_status (verified/replaced/not_applicable) before archiving.",
    });
  }
}

function validateVisuals(findings: Finding[], gate: Gate): void {
  if (gate === "pre-write") return;
  const rows = readTsv(join(contextDir, "ledgers", "figures.tsv"));
  for (const row of rows) {
    const id = row.figure_id || row.title || "figure";
    const aiGenerated = (row.ai_generated || "").toLowerCase() === "yes";
    const placeholder = (row.placeholder || "").toLowerCase() === "yes";
    const evidenceStatus = (row.evidence_status || "").toLowerCase();
    const sourcePath = row.source_path || "";

    if ((aiGenerated || placeholder) && evidenceStatus === "evidence") {
      addFinding(findings, {
        severity: "P0",
        code: aiGenerated ? "VISUAL_AI_EVIDENCE" : "VISUAL_PLACEHOLDER_EVIDENCE",
        target: id,
        message: "Generated or placeholder visual is marked as evidence.",
        required_action: "Relabel it as illustration/placeholder or replace it with real evidence.",
      });
    }

    if (evidenceStatus === "evidence") {
      const resolved = sourcePath ? resolve(projectDir, sourcePath) : "";
      if (!sourcePath || !existsSync(resolved)) {
        addFinding(findings, {
          severity: "P0",
          code: "VISUAL_SOURCE_MISSING",
          target: id,
          message: "Evidence visual has no existing source path.",
          required_action: "Add the real screenshot/photo/CAD/simulation/chart source or mark it missing.",
        });
      }
    }
  }
}

function validateDataAvailability(findings: Finding[], gate: Gate): void {
  if (gate === "pre-write") return;
  const text = readProjectTextFiles().map((file) => file.text).join("\n");
  if (!/(数据可用性|data availability|source data|accession|repository|数据仓库|源数据)/i.test(text)) {
    return;
  }
  const data = readYaml<Record<string, any>>(join(contextDir, "ledgers", "data-availability.yaml"), {});
  const status = String(data.status || "").toLowerCase();
  if (!["verified", "available", "not_applicable", "not-applicable"].includes(status)) {
    addFinding(findings, {
      severity: "P0",
      code: "DATA_SOURCE_MISSING",
      target: "ledgers/data-availability.yaml",
      message: "Manuscript mentions data availability or source data, but data provenance is not verified.",
      required_action: "Map source data, repository/accession, or mark the data statement not applicable.",
    });
  }
}

function validateDocxEvidence(findings: Finding[], gate: Gate): void {
  if (gate !== "pre-archive") return;
  const out = latestOutput();
  if (!out || !out.endsWith(".docx")) return;
  const rows = readTsv(join(contextDir, "ledgers", "docx.tsv"));
  const verified = rows.some((row) => {
    const outputMatches = Boolean(row.output_path) && resolve(projectDir, row.output_path) === out;
    const packageValid = ["yes", "true", "valid"].includes((row.package_valid || "").toLowerCase());
    const renderChecked = ["yes", "true", "verified"].includes((row.render_checked || "").toLowerCase());
    const statusOk = (row.status || "").toLowerCase() === "verified";
    const pageCount = Number(row.page_count || 0);
    const reviewedPages = (row.reviewed_pages || "").toLowerCase();
    const allPagesReviewed = reviewedPages === "all" || Number(reviewedPages) >= pageCount;
    const pngDir = row.png_dir ? resolve(projectDir, row.png_dir) : "";
    const pngCount = pngDir && existsSync(pngDir) && statSync(pngDir).isDirectory()
      ? readdirSync(pngDir).filter((name) => /^page-[0-9]+\.png$/i.test(name)).length
      : 0;
    const pngsExist = pageCount > 0 && pngCount >= pageCount;
    return outputMatches && packageValid && renderChecked && statusOk && allPagesReviewed && pngsExist;
  });
  if (!verified) {
    addFinding(findings, {
      severity: "P0",
      code: "DOCX_RENDER_NOT_VERIFIED",
      target: rel(out),
      message: "Archive gate requires page-PNG DOCX render verification for the latest output.",
      required_action: "Render the DOCX, inspect every page PNG, and add a verified row with png_dir/page_count/reviewed_pages to .paper-context/ledgers/docx.tsv.",
    });
  }
}

function latestSourceMtime(): number {
  const candidates = [
    ...contentFiles(),
    join(projectDir, "thesis.yaml"),
    join(projectDir, "assets", "refs.bib"),
    join(projectDir, "format", "reference.docx"),
    join(projectDir, "format", "filter.lua"),
    join(projectDir, "format", "citation.csl"),
  ].filter((path) => existsSync(path));
  return candidates.length ? Math.max(...candidates.map((path) => statSync(path).mtimeMs)) : 0;
}

function validateStale(findings: Finding[], gate: Gate): void {
  const out = latestOutput();
  if (!out) {
    if (gate === "pre-archive") {
      addFinding(findings, {
        severity: "P0",
        code: "OUTPUT_MISSING",
        target: "output/",
        message: "No DOCX or PDF output exists for archive.",
        required_action: "Export and validate the final document before archiving.",
      });
    }
    return;
  }

  const sourceMtime = latestSourceMtime();
  const outputMtime = statSync(out).mtimeMs;
  if (sourceMtime > outputMtime + 1000) {
    addFinding(findings, {
      severity: gate === "pre-archive" ? "P0" : "P1",
      code: "OUTPUT_STALE",
      target: rel(out),
      message: "Latest output is older than current source, assets, or format files.",
      required_action: "Re-export or downgrade the output from final/archive status.",
    });
  }

  const statePath = join(projectDir, ".thesis.json");
  if (existsSync(statePath)) {
    const state = readJson<{ versions?: { tag?: string; output?: string }[] }>(statePath, {});
    for (const version of state.versions ?? []) {
      if (version.output && !existsSync(resolve(projectDir, version.output))) {
        addFinding(findings, {
          severity: gate === "pre-archive" ? "P0" : "P1",
          code: "VERSION_OUTPUT_MISSING",
          target: version.output,
          message: `.thesis.json version "${version.tag || "unknown"}" points to a missing output file.`,
          required_action: "Restore the output file, fix the version entry, or create a new version tag.",
        });
      }
    }
  }
}

function validateTodo(findings: Finding[], gate: Gate): void {
  if (gate === "pre-write") return;
  for (const file of readProjectTextFiles()) {
    if (/\[TODO(?::|\])|TODO:|待补充|需补充证据/.test(file.text)) {
      addFinding(findings, {
        severity: "P0",
        code: "TODO_REMAINING",
        target: rel(file.path),
        message: "Source still contains TODO or missing-evidence markers.",
        required_action: "Resolve TODO markers or keep the output in draft status.",
      });
      return;
    }
  }
}

function validatePrivacy(findings: Finding[], gate: Gate): void {
  const files = listFiles(projectDir, () => true);
  for (const path of files) {
    const name = basename(path);
    if ((/^\.env(?:\.|$)/.test(name) || name.endsWith(".env")) && name !== ".env.example") {
      addFinding(findings, {
        severity: "P0",
        code: "PRIVACY_ENV_FILE",
        target: rel(path),
        message: "Environment or credential file is present in the project tree.",
        required_action: "Remove it from delivery context and keep secrets out of paper artifacts.",
      });
      return;
    }
  }

  const textFiles = files.filter((path) => {
    if (normalizePath(path).endsWith(".paper-context/private.json")) return false;
    return [".md", ".txt", ".json", ".yaml", ".yml", ".tsv", ".bib"].includes(extname(path).toLowerCase());
  });
  for (const path of textFiles) {
    const text = readText(path).slice(0, 500_000);
    if (/(sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY)/.test(text)) {
      addFinding(findings, {
        severity: "P0",
        code: "PRIVACY_SECRET_TEXT",
        target: rel(path),
        message: "Potential credential material appears in a project text file.",
        required_action: "Remove or redact credentials before continuing.",
      });
      return;
    }
    if (/\/Users\/[^/\s]+/.test(text)) {
      addFinding(findings, {
        severity: gate === "pre-archive" ? "P0" : "P1",
        code: "PRIVACY_ABSOLUTE_PATH",
        target: rel(path),
        message: "Local absolute path appears in context or manuscript text.",
        required_action: "Replace with project-relative or redacted paths.",
      });
      return;
    }
  }
}

function validateProjectShape(findings: Finding[], gate: Gate): void {
  if (!existsSync(contextDir)) {
    addFinding(findings, {
      severity: "P0",
      code: "CONTEXT_MISSING",
      target: ".paper-context/",
      message: "Project context has not been initialized.",
      required_action: "Run context init before project-level paper work.",
    });
  }
  const yamlPath = join(projectDir, "thesis.yaml");
  if (!existsSync(yamlPath)) {
    addFinding(findings, {
      severity: "P0",
      code: "THESIS_YAML_MISSING",
      target: "thesis.yaml",
      message: "Project source-of-truth metadata is missing.",
      required_action: "Create thesis.yaml or select a different source-of-truth path.",
    });
  } else {
    try {
      readThesisYaml();
    } catch (error: any) {
      addFinding(findings, {
        severity: "P0",
        code: "THESIS_YAML_INVALID",
        target: "thesis.yaml",
        message: `thesis.yaml could not be parsed: ${error.message}`,
        required_action: "Fix thesis.yaml before loading or validating context.",
      });
    }
  }

  const contentDir = join(projectDir, "content");
  if (!existsSync(contentDir)) {
    addFinding(findings, {
      severity: "P0",
      code: "CONTENT_DIR_MISSING",
      target: "content/",
      message: "Editable manuscript source directory is missing.",
      required_action: "Create content/ or import the manuscript before writing.",
    });
    return;
  }

  const files = chapterFiles();
  if (files.length === 0) {
    addFinding(findings, {
      severity: "P0",
      code: "CHAPTER_STATE_UNKNOWN",
      target: "content/",
      message: "No chapter files were found or configured.",
      required_action: "Add chapter files or update thesis.yaml chapters.",
    });
  }

  for (const filename of files) {
    const path = join(contentDir, filename);
    if (!existsSync(path)) {
      addFinding(findings, {
        severity: "P0",
        code: "CHAPTER_FILE_MISSING",
        target: `content/${filename}`,
        message: "thesis.yaml references a missing chapter file.",
        required_action: "Create the missing file or remove it from thesis.yaml chapters.",
      });
    }
  }

  const statePath = join(projectDir, ".thesis.json");
  if (existsSync(statePath)) {
    try {
      JSON.parse(readText(statePath));
    } catch (error: any) {
      addFinding(findings, {
        severity: "P0",
        code: "THESIS_STATE_INVALID",
        target: ".thesis.json",
        message: `.thesis.json could not be parsed: ${error.message}`,
        required_action: "Fix .thesis.json or recreate thesis state.",
      });
    }
  } else if (gate === "pre-archive") {
    addFinding(findings, {
      severity: "P0",
      code: "THESIS_STATE_MISSING",
      target: ".thesis.json",
      message: "Archive gate requires version/export state.",
      required_action: "Create .thesis.json via import or version tag before archiving.",
    });
  }
}

function validateVersions(findings: Finding[]): void {
  const versionsPath = join(contextDir, "versions.yaml");
  if (!existsSync(versionsPath)) return;
  const data = readYaml<Record<string, any>>(versionsPath, {});
  const versions = Array.isArray(data.versions) ? data.versions : [];
  const ids = new Set(versions.map((v: any) => v.id).filter(Boolean));
  for (const key of ["current_version", "active_version"]) {
    if (data[key] && !ids.has(data[key])) {
      addFinding(findings, {
        severity: "P0",
        code: "VERSION_POINTER_INVALID",
        target: `versions.yaml#${key}`,
        message: `${key} does not point to an existing version entry.`,
        required_action: "Fix versions.yaml pointers or create the missing version entry.",
      });
    }
  }
}

function runValidation(gate: Gate): ValidationResult {
  const findings: Finding[] = [];
  validateProjectShape(findings, gate);
  validateVersions(findings);
  validateClaimEvidence(findings, gate);
  validateTodo(findings, gate);
  validateCitations(findings, gate);
  validateCitationVerification(findings, gate);
  validateVisuals(findings, gate);
  validateDataAvailability(findings, gate);
  validateDocxEvidence(findings, gate);
  validateStale(findings, gate);
  validatePrivacy(findings, gate);

  const summary = {
    p0: findings.filter((f) => f.severity === "P0").length,
    p1: findings.filter((f) => f.severity === "P1").length,
    p2: findings.filter((f) => f.severity === "P2").length,
  };

  const hasBlocking = findings.some((f) => f.blocking);
  let status: ValidationResult["status"] = hasBlocking ? "blocked" : "passed";
  if (hasBlocking && values.force) {
    if (!values.reason || !values.reason.trim()) {
      findings.push({
        severity: "P0",
        code: "FORCE_REASON_REQUIRED",
        blocking: true,
        target: "--force",
        message: "P0 override requires --reason.",
        required_action: "Pass --force --reason <text> or resolve P0 findings.",
      });
      summary.p0 += 1;
    } else {
      status = "forced";
      for (const finding of findings) finding.blocking = false;
      appendEvent("validation-forced", { gate, reason: values.reason, findings: summary });
    }
  }

  return { gate, status, summary, findings };
}

function loadContext(format: string): void {
  const manifest = readJson(join(contextDir, "manifest.json"), {});
  const versions = readYaml<Record<string, any>>(join(contextDir, "versions.yaml"), {});
  const snapshot = buildSnapshot();
  const dirty = Boolean(manifest && (manifest as any).state_hash && (manifest as any).state_hash !== snapshot.state_hash);
  const payload = {
    schema_version: SCHEMA_VERSION,
    project_dir: normalizePath(projectDir),
    context_path: existsSync(contextDir) ? ".paper-context" : "",
    manifest,
    versions: { ...versions, dirty },
    snapshot,
  };

  if (format === "json") {
    console.log(JSON.stringify(payload, null, 2));
  } else if (format === "yaml") {
    console.log(YAML.stringify(payload));
  } else {
    console.log(`# Paper Project Context

- Project: ${basename(projectDir)}
- Context path: ${payload.context_path || "missing"}
- Context state: ${(manifest as any).context_state || "unknown"}
- Current version: ${versions.current_version || "unknown"}
- Active version: ${versions.active_version || "unknown"}
- Next version: ${versions.next_version || "none"}
- Dirty: ${dirty}
- Latest output: ${snapshot.latest_output?.path || "none"}
- State hash: ${snapshot.state_hash}`);
  }
}

function writeSnapshot(label: string): void {
  if (!existsSync(contextDir)) runRefresh("init");
  const snapshot = buildSnapshot();
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "snapshot";
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const path = join(contextDir, "snapshots", `${stamp}-${safeLabel}.json`);
  writeJson(path, snapshot);

  if (safeLabel.startsWith("version-")) {
    const tag = safeLabel.replace(/^version-/, "");
    updateVersionCheckpoint(tag, snapshot);
  }

  appendEvent("snapshot", {
    label: safeLabel,
    snapshot: rel(path),
    state_hash: snapshot.state_hash,
  });
  console.log(`Snapshot: ${rel(path)}`);
}

function updateVersionCheckpoint(tag: string, snapshot: Snapshot): void {
  const versionsPath = join(contextDir, "versions.yaml");
  const data = buildVersions(tag);
  const versions = Array.isArray(data.versions) ? data.versions : [];
  const existing = versions.find((v: any) => v.id === tag);
  if (existing) {
    existing.status = "active";
    existing.updated_at = nowIso();
    existing.source_hash = snapshot.state_hash;
    existing.checkpoint = `checkpoints/${tag}.md`;
    existing.thesis_state_tag = tag;
  } else {
    versions.push({
      id: tag,
      type: "export",
      status: "active",
      role: "version tag created by version.ts",
      created_at: nowIso(),
      updated_at: nowIso(),
      source_hash: snapshot.state_hash,
      checkpoint: `checkpoints/${tag}.md`,
      thesis_state_tag: tag,
      changed_files: snapshot.files.map((file) => file.path),
      ledger_refs: [],
    });
  }
  for (const version of versions) {
    if (version.id !== tag && version.status === "active") version.status = "superseded";
  }
  data.current_version = tag;
  data.active_version = tag;
  data.next_version = "";
  data.dirty = false;
  data.versions = versions;
  writeYaml(versionsPath, data);
  writeCheckpoint(tag, "version");
  updateCurrentMd(snapshot, data);
}

try {
  switch (command) {
    case "init": {
      const snapshot = runRefresh("init");
      console.log(`Context initialized: ${rel(contextDir)}`);
      console.log(`State hash: ${snapshot.state_hash}`);
      break;
    }
    case "update": {
      const snapshot = runRefresh("update");
      console.log(`Context updated: ${rel(contextDir)}`);
      console.log(`State hash: ${snapshot.state_hash}`);
      break;
    }
    case "load": {
      loadContext(values.format || "md");
      break;
    }
    case "snapshot": {
      writeSnapshot(values.label || "snapshot");
      break;
    }
    case "validate": {
      const gate = (values.gate || "pre-write") as Gate;
      if (!VALID_GATES.has(gate)) {
        console.error(`Error: invalid gate "${values.gate}". Expected pre-write, pre-export, or pre-archive.`);
        process.exit(2);
      }
      const result = runValidation(gate);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.status === "blocked" ? 1 : 0);
      break;
    }
    default:
      console.error(`Error: unknown command "${command}"`);
      printHelp();
      process.exit(2);
  }
} catch (error: any) {
  console.error(`Error: ${error.message}`);
  process.exit(3);
}
