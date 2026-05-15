import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const skillsDir = join(root, "skills");
const files = ["README.md"];

const bannedChecks = [
  { label: "nature-skills", pattern: /nature-skills\b/i },
  { label: "nature-skills-main/", pattern: /nature-skills-main\// },
  { label: "thesis-writer/", pattern: /thesis-writer\// },
  { label: "Claude Code", pattern: /\bClaude Code\b/ },
  { label: "微信群", pattern: /微信群/ },
  { label: "Original upstream repository:", pattern: /Original upstream repository:/i },
  { label: "cp -R skills/nature-", pattern: /cp -R\s+skills\/nature-/i },
];

let failed = false;

function fail(message) {
  console.error(`ERROR: ${message}`);
  failed = true;
}

function isAllowedContext(file, line) {
  if (
    file === "README.md" &&
    /migration sources/i.test(line) &&
    /public plugin surface/i.test(line)
  ) {
    return true;
  }
  return false;
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

  const lines = readFileSync(fullPath, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const check of bannedChecks) {
      if (check.pattern.test(line) && !isAllowedContext(file, line)) {
        fail(`${file}:${index + 1} contains banned upstream wording: ${check.label}`);
      }
    }
  });
}

if (failed) {
  process.exit(1);
}

console.log(`No upstream wording leakage found in ${files.length} public-facing files.`);
