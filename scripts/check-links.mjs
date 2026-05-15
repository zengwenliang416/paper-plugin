import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const root = process.cwd();
const skillsDir = join(root, "skills");
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
      return value.includes("/") || /\.(md|json|mjs|ts|py|sh)$/.test(value);
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
  for (const name of readdirSync(skillsDir).sort()) {
    const dir = join(skillsDir, name);
    if (!statSync(dir).isDirectory()) {
      continue;
    }
    files.push(`skills/${name}/README.md`, `skills/${name}/SKILL.md`);
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
