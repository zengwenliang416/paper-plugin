import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { getPluginPaths, listSkillDirectories } from "./_plugin-paths.mjs";

const root = process.cwd();
const { manifest, manifestError, manifestPath, skillsDir } = getPluginPaths(root);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function assertFile(path, label = path) {
  if (!existsSync(path)) {
    fail(`missing required file: ${label}`);
  } else if (!statSync(path).isFile()) {
    fail(`required path is not a file: ${label}`);
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
} else if (manifestError) {
  fail(manifestError.message);
} else {
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

const manuscriptSkillDir = join(skillsDir, "paper-manuscript-writing");
if (existsSync(manuscriptSkillDir)) {
  assertFile(
    join(manuscriptSkillDir, "scripts", "export.ts"),
    "paper-manuscript-writing/scripts/export.ts"
  );
  assertFile(
    join(manuscriptSkillDir, "scripts", "postprocess-docx.ts"),
    "paper-manuscript-writing/scripts/postprocess-docx.ts"
  );
  assertFile(
    join(manuscriptSkillDir, "filters", "thesis.lua"),
    "paper-manuscript-writing/filters/thesis.lua"
  );
  assertFile(
    join(manuscriptSkillDir, "assets", "gbt7714-numeric.csl"),
    "paper-manuscript-writing/assets/gbt7714-numeric.csl"
  );
  assertFile(
    join(manuscriptSkillDir, "references", "design-thesis-workflow.md"),
    "paper-manuscript-writing/references/design-thesis-workflow.md"
  );

  const packagePath = join(root, "package.json");
  if (existsSync(packagePath)) {
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    for (const dep of ["jszip", "tsx", "yaml"]) {
      if (!deps[dep]) {
        fail(`package.json must declare ${dep}; manuscript scripts import it`);
      }
    }
  }
}

const docxRepairSkillDir = join(skillsDir, "paper-docx-repair");
if (existsSync(docxRepairSkillDir)) {
  assertFile(
    join(docxRepairSkillDir, "scripts", "repair-docx.ts"),
    "paper-docx-repair/scripts/repair-docx.ts"
  );
  assertFile(
    join(docxRepairSkillDir, "references", "ooxml-repair-rules.md"),
    "paper-docx-repair/references/ooxml-repair-rules.md"
  );

  const packagePath = join(root, "package.json");
  if (existsSync(packagePath)) {
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    for (const dep of ["jszip", "tsx"]) {
      if (!deps[dep]) {
        fail(`package.json must declare ${dep}; docx repair scripts import it`);
      }
    }
  }
}

if (!process.exitCode) {
  console.log("Plugin scaffold is valid.");
}
