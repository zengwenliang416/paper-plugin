import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export function getPluginPaths(rootDir = process.cwd()) {
  const manifestPath = join(rootDir, ".codex-plugin", "plugin.json");
  let manifest = null;

  if (existsSync(manifestPath)) {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  }

  const configuredSkills =
    typeof manifest?.skills === "string" && manifest.skills.trim()
      ? manifest.skills.trim()
      : "./skills";

  return {
    rootDir,
    manifestPath,
    manifest,
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
