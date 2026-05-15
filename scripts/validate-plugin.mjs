import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const manifestPath = join(root, ".codex-plugin", "plugin.json");

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${path} is not valid JSON: ${error.message}`);
    return {};
  }
}

function assertString(object, key, label = key) {
  if (typeof object[key] !== "string" || object[key].trim() === "") {
    fail(`${label} must be a non-empty string`);
  }
}

function assertStringArray(object, key, label = key, { maxLength } = {}) {
  if (!Array.isArray(object[key])) {
    fail(`${label} must be an array`);
    return;
  }

  if (typeof maxLength === "number" && object[key].length > maxLength) {
    fail(`${label} must contain at most ${maxLength} entries`);
  }

  for (const [index, value] of object[key].entries()) {
    if (typeof value !== "string" || value.trim() === "") {
      fail(`${label}[${index}] must be a non-empty string`);
    }
  }
}

if (!existsSync(manifestPath)) {
  fail("missing .codex-plugin/plugin.json");
} else {
  const manifest = readJson(manifestPath);
  assertString(manifest, "name");
  assertString(manifest, "version");
  assertString(manifest, "description");

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.name || "")) {
    fail("manifest name must be lower-case kebab-case");
  }

  if (manifest.skills) {
    const skillDir = join(root, manifest.skills.replace(/^\.\//, ""));
    if (!existsSync(skillDir) || !statSync(skillDir).isDirectory()) {
      fail(`skills path does not exist: ${manifest.skills}`);
    }
  }

  if (!manifest.interface || typeof manifest.interface !== "object") {
    fail("interface must be present");
  } else {
    assertString(manifest.interface, "displayName", "interface.displayName");
    assertString(manifest.interface, "shortDescription", "interface.shortDescription");
    assertString(manifest.interface, "longDescription", "interface.longDescription");
    assertString(manifest.interface, "developerName", "interface.developerName");
    assertString(manifest.interface, "category", "interface.category");
    assertStringArray(manifest.interface, "capabilities", "interface.capabilities");
    assertStringArray(manifest.interface, "defaultPrompt", "interface.defaultPrompt", {
      maxLength: 3,
    });
  }
}

const skillsDir = join(root, "skills");
if (existsSync(skillsDir)) {
  for (const name of readdirSync(skillsDir)) {
    const skillPath = join(skillsDir, name, "SKILL.md");
    if (!existsSync(skillPath)) {
      fail(`missing SKILL.md for skills/${name}`);
      continue;
    }
    const text = readFileSync(skillPath, "utf8");
    if (!text.startsWith("---\n")) {
      fail(`${skillPath} must start with YAML frontmatter`);
    }
    if (!/^name:\s*[a-z0-9]+(?:-[a-z0-9]+)*\s*$/m.test(text)) {
      fail(`${skillPath} must include a kebab-case name in frontmatter`);
    }
    if (!/^description:\s*.+$/m.test(text)) {
      fail(`${skillPath} must include a description in frontmatter`);
    }
  }
}

if (!process.exitCode) {
  console.log("Plugin scaffold is valid.");
}
