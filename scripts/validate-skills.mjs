import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const skillsDir = join(root, "skills");
let failed = false;

function fail(message) {
  console.error(`ERROR: ${message}`);
  failed = true;
}

function extractFrontmatter(text, file) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    fail(`${file} must start with YAML frontmatter`);
    return "";
  }
  return match[1];
}

function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    fail(`${path} could not be read: ${error.message}`);
    return "";
  }
}

if (!existsSync(skillsDir) || !statSync(skillsDir).isDirectory()) {
  console.error("ERROR: missing skills directory");
  process.exit(1);
}

for (const name of readdirSync(skillsDir).sort()) {
  const dir = join(skillsDir, name);
  if (!statSync(dir).isDirectory()) {
    continue;
  }

  for (const required of ["SKILL.md", "README.md", "references"]) {
    const requiredPath = join(dir, required);
    if (!existsSync(requiredPath)) {
      fail(`${name} missing ${required}`);
      continue;
    }
    if (required === "references" && !statSync(requiredPath).isDirectory()) {
      fail(`${name} references must be a directory`);
    }
  }

  const skillPath = join(dir, "SKILL.md");
  const readmePath = join(dir, "README.md");
  if (!existsSync(skillPath) || !existsSync(readmePath)) {
    continue;
  }

  const skillText = readText(skillPath);
  const readmeText = readText(readmePath);
  const frontmatter = extractFrontmatter(skillText, skillPath);
  const frontmatterName = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const frontmatterDescription = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const skillHeading = skillText.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
  const readmeHeading = readmeText.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";

  if (frontmatterName !== name) {
    fail(`${skillPath} frontmatter name must match directory name (${name})`);
  }
  if (!frontmatterDescription) {
    fail(`${skillPath} must include a non-empty description in frontmatter`);
  }
  if (!skillHeading) {
    fail(`${skillPath} must include a level-1 heading`);
  }
  if (!readmeHeading) {
    fail(`${readmePath} must include a level-1 heading`);
  }
  if (skillHeading && readmeHeading && skillHeading !== readmeHeading) {
    fail(`${name} SKILL.md and README.md must use the same level-1 heading`);
  }

  for (const [entryFile, entryText] of [
    [skillPath, skillText],
    [readmePath, readmeText],
  ]) {
    for (const banned of ["nature-skills-main/", "thesis-writer/"]) {
      if (entryText.includes(banned)) {
        fail(`${entryFile} still references ${banned}`);
      }
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("Skill packages are structurally valid.");
