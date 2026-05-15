import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { getPluginPaths, listSkillDirectories } from "./_plugin-paths.mjs";

const root = process.cwd();
const { manifestPath, skillsDir } = getPluginPaths(root);

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
    if (!existsSync(skillsDir)) {
      fail(`skills path does not exist: ${manifest.skills}`);
    } else if (!statSync(skillsDir).isDirectory()) {
      fail(`skills path is not a directory: ${manifest.skills}`);
    }
  } else if (existsSync(skillsDir) && !statSync(skillsDir).isDirectory()) {
    fail(`default skills path is not a directory: ${skillsDir}`);
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

if (existsSync(skillsDir)) {
  for (const { dir, relativeDir } of listSkillDirectories(root)) {
    const skillPath = join(dir, "SKILL.md");
    if (!existsSync(skillPath)) {
      fail(`missing SKILL.md for ${relativeDir}`);
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
