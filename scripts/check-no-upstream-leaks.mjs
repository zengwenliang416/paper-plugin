import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getPluginPaths, listSkillDirectories } from "./_plugin-paths.mjs";

const { rootDir: root, skillsDir } = getPluginPaths();
const files = ["README.md"];

const provenanceSensitiveChecks = [
  { label: "nature-skills", pattern: /nature-skills\b/i },
  { label: "nature-skills-main/", pattern: /nature-skills-main\// },
  { label: "thesis-writer/", pattern: /thesis-writer\// },
  { label: "Original upstream repository:", pattern: /Original upstream repository:/i },
];

const bannedChecks = [
  { label: "Claude Code", pattern: /\bClaude Code\b/ },
  { label: "微信群", pattern: /微信群/ },
  { label: "cp -R skills/nature-", pattern: /cp -R\s+skills\/nature-/i },
];

let failed = false;

function fail(message) {
  console.error(`ERROR: ${message}`);
  failed = true;
}

function getContext(lines, index, radius = 2) {
  return lines
    .slice(Math.max(0, index - radius), index + radius + 1)
    .join(" ");
}

function isAllowedProvenanceContext(lines, index) {
  const context = getContext(lines, index);
  const hasProvenanceSignal =
    /\b(migration|migrated|migrating|provenance|source|sources|origin|upstream|derived|ported|adapted|legacy|historical)\b/i.test(
      context
    );
  const hasBoundarySignal =
    /\b(public plugin surface|public surface|not part of the public|not shipped|internal only|source-only|source only|private|legacy|historical|archive|archived)\b/i.test(
      context
    );
  return hasProvenanceSignal && hasBoundarySignal;
}

if (existsSync(skillsDir)) {
  for (const { relativeDir } of listSkillDirectories(root)) {
    files.push(`${relativeDir}/README.md`, `${relativeDir}/SKILL.md`);
  }
}

for (const file of files) {
  const fullPath = join(root, file);
  if (!existsSync(fullPath)) {
    fail(`missing file: ${file}`);
    continue;
  }

  const lines = readFileSync(fullPath, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const check of provenanceSensitiveChecks) {
      if (check.pattern.test(line) && !isAllowedProvenanceContext(lines, index)) {
        fail(`${file}:${index + 1} contains banned upstream wording: ${check.label}`);
      }
    }

    for (const check of bannedChecks) {
      if (check.pattern.test(line)) {
        fail(`${file}:${index + 1} contains banned upstream wording: ${check.label}`);
      }
    }
  });
}

if (failed) {
  process.exit(1);
}

console.log(`No upstream wording leakage found in ${files.length} public-facing files.`);
