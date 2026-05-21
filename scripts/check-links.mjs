import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { getPluginPaths, listSkillDirectories } from "./_plugin-paths.mjs";

const { rootDir: root, skillsDir } = getPluginPaths();
const files = ["README.md"];
let checked = 0;
let failed = false;

function fail(message) {
  console.error(`ERROR: ${message}`);
  failed = true;
}

function extractInlineCodePaths(text) {
  return [...text.matchAll(/`([^`\n]+)`/g)]
    .map((match) => match[1].trim())
    .filter((value) => {
      if (!value || /\s/.test(value)) {
        return false;
      }
      if (/^(https?:|mailto:|#)/.test(value)) {
        return false;
      }
      const localReference = value.replace(/^\.\//, "");
      return /^(references|scripts|assets|filters|examples|skills|docs|\.codex-plugin)\//.test(
        localReference,
      ) || /^(README|SKILL)\.md$/.test(localReference);
    });
}

function extractMarkdownLinks(text) {
  return [...text.matchAll(/\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)]
    .map((match) => match[1].trim())
    .filter((value) => value && !/^(https?:|mailto:|#)/.test(value));
}

function normalizeTarget(rawTarget) {
  let target = rawTarget.trim().replace(/^<|>$/g, "");
  target = target.replace(/[?#].*$/, "");
  if (!target) {
    return null;
  }
  return target;
}

function resolveTarget(file, target) {
  if (target.startsWith("/")) {
    return join(root, target.slice(1));
  }
  return normalize(join(root, dirname(file), target));
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

  const text = readFileSync(fullPath, "utf8");
  const references = new Set([
    ...extractInlineCodePaths(text),
    ...extractMarkdownLinks(text),
  ]);

  for (const rawTarget of references) {
    const target = normalizeTarget(rawTarget);
    if (!target) {
      continue;
    }

    checked += 1;
    const resolved = resolveTarget(file, target);
    if (!existsSync(resolved)) {
      fail(`${file} references missing local path: ${target}`);
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Link scan passed for ${files.length} files with ${checked} local references.`);
