import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

function readPluginManifest(manifestPath) {
  if (!existsSync(manifestPath)) {
    return { manifest: null, manifestError: null };
  }

  try {
    return {
      manifest: JSON.parse(readFileSync(manifestPath, "utf8")),
      manifestError: null,
    };
  } catch (error) {
    return {
      manifest: null,
      manifestError: new Error(`${manifestPath} is not valid JSON: ${error.message}`),
    };
  }
}

export function getPluginPaths(rootDir = process.cwd()) {
  const manifestPath = join(rootDir, ".codex-plugin", "plugin.json");
  const { manifest, manifestError } = readPluginManifest(manifestPath);

  const configuredSkills =
    typeof manifest?.skills === "string" && manifest.skills.trim()
      ? manifest.skills.trim()
      : "./skills";

  return {
    rootDir,
    manifestPath,
    manifest,
    manifestError,
    skillsDir: resolve(rootDir, configuredSkills),
  };
}

export function listSkillDirectories(rootDir = process.cwd()) {
  const { skillsDir } = getPluginPaths(rootDir);

  if (!existsSync(skillsDir) || !statSync(skillsDir).isDirectory()) {
    return [];
  }

  return readdirSync(skillsDir)
    .sort()
    .filter((name) => statSync(join(skillsDir, name)).isDirectory())
    .map((name) => {
      const dir = join(skillsDir, name);
      return {
        name,
        dir,
        relativeDir: relative(rootDir, dir) || ".",
      };
    });
}
