import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listSkillDirectories } from "./_plugin-paths.mjs";

const skills = listSkillDirectories().map(({ name, dir }) => {
  const text = readFileSync(join(dir, "SKILL.md"), "utf8");
  const description = text.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
  return { name, description };
});

console.log(JSON.stringify(skills, null, 2));
