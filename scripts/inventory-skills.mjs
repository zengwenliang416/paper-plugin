import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const skillsDir = join(root, "skills");

const skills = readdirSync(skillsDir)
  .sort()
  .filter((name) => statSync(join(skillsDir, name)).isDirectory())
  .map((name) => {
    const text = readFileSync(join(skillsDir, name, "SKILL.md"), "utf8");
    const description = text.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
    return { name, description };
  });

console.log(JSON.stringify(skills, null, 2));
