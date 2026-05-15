# Paper Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild this repository from a placeholder Codex plugin into a publishable academic paper workflow plugin with seven public skills reorganized from `thesis-writer/` and `nature-skills-main/`.

**Architecture:** Keep the plugin Codex-only and skills-first. Public behavior lives under `skills/`, while plugin-root `docs/`, `scripts/`, and `assets/` hold product-level material. Migrate low-overlap skills first, then rebuild overlapping capability domains (`paper-literature`, `paper-manuscript-writing`) after the package template and validation rules are stable.

**Tech Stack:** JSON manifest, Markdown skill packages, Node.js validation scripts, existing TypeScript/Python utilities from upstream skill sources, Git for incremental commits.

---

## File Structure Map

### Existing files to modify

- Modify: `.codex-plugin/plugin.json`
- Modify: `README.md`
- Modify: `scripts/validate-plugin.mjs`
- Delete or replace: `skills/paper-assistant/SKILL.md`

### New plugin-root files

- Create: `docs/superpowers/plans/2026-05-15-paper-plugin-implementation.md`
- Create: `docs/migration-notes.md`
- Create: `scripts/validate-skills.mjs`
- Create: `scripts/check-links.mjs`
- Create: `scripts/check-no-upstream-leaks.mjs`
- Create: `scripts/inventory-skills.mjs`

### New public skill packages

- Create: `skills/paper-reader/`
- Create: `skills/paper-manuscript-writing/`
- Create: `skills/paper-literature/`
- Create: `skills/paper-response/`
- Create: `skills/paper-paper2ppt/`
- Create: `skills/paper-figure/`
- Create: `skills/paper-data/`

Each package should eventually contain:

- `SKILL.md`
- `README.md`
- `references/`
- `scripts/`
- `assets/`
- `examples/` when needed
- `tests/` when needed

### Source directories to preserve during migration

- Keep for migration source only: `thesis-writer/`
- Keep for migration source only: `nature-skills-main/`

Do not delete those source directories until the final cleanup task.

## Task 1: Build the target plugin skeleton

**Files:**
- Create: `skills/paper-reader/SKILL.md`
- Create: `skills/paper-manuscript-writing/SKILL.md`
- Create: `skills/paper-literature/SKILL.md`
- Create: `skills/paper-response/SKILL.md`
- Create: `skills/paper-paper2ppt/SKILL.md`
- Create: `skills/paper-figure/SKILL.md`
- Create: `skills/paper-data/SKILL.md`
- Delete: `skills/paper-assistant/SKILL.md`

- [ ] **Step 1: Remove the placeholder skill**

Run:

```bash
rm -rf skills/paper-assistant
```

Expected: `skills/paper-assistant/` no longer exists.

- [ ] **Step 2: Create the public skill directories**

Run:

```bash
mkdir -p \
  skills/paper-reader/{references,scripts,assets,examples,tests} \
  skills/paper-manuscript-writing/{references,scripts,assets,examples,tests} \
  skills/paper-literature/{references,scripts,assets,examples,tests} \
  skills/paper-response/{references,scripts,assets,examples,tests} \
  skills/paper-paper2ppt/{references,scripts,assets,examples,tests} \
  skills/paper-figure/{references,scripts,assets,examples,tests} \
  skills/paper-data/{references,scripts,assets,examples,tests}
```

Expected: all seven skill directories exist with the standard subfolders.

- [ ] **Step 3: Add minimal `SKILL.md` frontmatter stubs so validation can run**

Write these files with the following exact content pattern, changing `name` and the one-line purpose per package:

```md
---
name: paper-reader
description: Use when the user needs a source-grounded bilingual academic paper reader with stable source anchors and figure placement.
---

# Paper Reader

This skill package is under migration. Use package-local references, scripts, and assets only.
```

Also create equivalent stubs for:

- `paper-manuscript-writing`
- `paper-literature`
- `paper-response`
- `paper-paper2ppt`
- `paper-figure`
- `paper-data`

- [ ] **Step 4: Run the existing validator**

Run:

```bash
npm run validate
```

Expected: PASS or a narrow set of failures only related to manifest/README work still pending.

- [ ] **Step 5: Commit the skeleton**

```bash
git add skills
git commit -m "refactor: replace placeholder skill with public package skeletons"
```

## Task 2: Upgrade plugin manifest and root README to product-level identity

**Files:**
- Modify: `.codex-plugin/plugin.json`
- Modify: `README.md`

- [ ] **Step 1: Write the failing product-surface checklist**

Create `docs/migration-notes.md` with this initial checklist:

```md
# Migration Notes

## Release-surface checklist

- [ ] plugin manifest describes an academic paper full-stack plugin
- [ ] default prompts expose reader, writing, and literature workflows
- [ ] root README is product-facing rather than scaffold-facing
- [ ] no placeholder `paper-assistant` messaging remains
```

- [ ] **Step 2: Replace the manifest placeholders with release-facing metadata**

Update `.codex-plugin/plugin.json` to this shape:

```json
{
  "name": "paper-plugin",
  "version": "0.1.0",
  "description": "Codex plugin for academic paper reading, writing, citation, response, and figure workflows.",
  "author": {
    "name": "Local Developer"
  },
  "license": "MIT",
  "keywords": [
    "paper",
    "research",
    "academic-writing",
    "citation",
    "codex",
    "skills"
  ],
  "skills": "./skills/",
  "interface": {
    "displayName": "Paper Plugin",
    "shortDescription": "Academic paper reading, writing, citation, response, and figure workflows",
    "longDescription": "A multi-skill Codex plugin for reading papers, drafting manuscripts, finding citations, preparing rebuttals, generating paper-based presentations, building figures, and writing data statements.",
    "developerName": "Local Developer",
    "category": "Productivity",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "defaultPrompt": [
      "Turn this paper into a source-grounded bilingual reader with figure anchors.",
      "Draft or restructure this manuscript section and flag missing evidence.",
      "Find supporting references for these claims and export usable citations."
    ],
    "brandColor": "#2563EB",
    "screenshots": []
  }
}
```

- [ ] **Step 3: Rewrite the root README as a product page**

Replace `README.md` with:

```md
# Paper Plugin

Codex plugin for the academic paper lifecycle: reading, manuscript writing, literature and citation workflows, reviewer responses, paper-to-PPT, figures, and data statements.

## Public Skills

- `paper-reader`
- `paper-manuscript-writing`
- `paper-literature`
- `paper-response`
- `paper-paper2ppt`
- `paper-figure`
- `paper-data`

## Development

Validate the plugin and skill packages:

```bash
npm run validate
node scripts/validate-skills.mjs
node scripts/check-links.mjs
node scripts/check-no-upstream-leaks.mjs
```

## Repository Layout

- `.codex-plugin/plugin.json` - plugin manifest
- `skills/` - public Codex skill packages
- `docs/` - design, plans, migration notes
- `scripts/` - plugin-level validation and inventory scripts
- `assets/` - plugin-level visual assets
```

- [ ] **Step 4: Re-run the validator**

Run:

```bash
npm run validate
```

Expected: PASS on manifest-level validation.

- [ ] **Step 5: Commit the product-surface update**

```bash
git add .codex-plugin/plugin.json README.md docs/migration-notes.md
git commit -m "docs: establish product-facing plugin identity"
```

## Task 3: Migrate `paper-reader` from `nature-reader`

**Files:**
- Create: `skills/paper-reader/README.md`
- Copy/modify: `skills/paper-reader/references/*`
- Optionally copy: `skills/paper-reader/assets/*`
- Modify: `skills/paper-reader/SKILL.md`

- [ ] **Step 1: Copy the upstream package resources**

Run:

```bash
cp -R nature-skills-main/skills/nature-reader/references skills/paper-reader/
[ -d nature-skills-main/skills/nature-reader/assets ] && cp -R nature-skills-main/skills/nature-reader/assets skills/paper-reader/ || true
```

Expected: `skills/paper-reader/references/` exists with the upstream reference files.

- [ ] **Step 2: Rewrite `skills/paper-reader/SKILL.md`**

Use this content:

```md
---
name: paper-reader
description: Use when the user needs a source-grounded bilingual academic paper reader with stable source anchors, figure placement, and follow-up answers tied to exact source blocks.
---

# Paper Reader

Use this skill to transform a paper PDF, article page, or extracted paper text into a source-grounded reading artifact.

## Core responsibilities

- preserve source-to-translation alignment
- build stable source anchors
- place figures and tables near the relevant discussion
- answer follow-up questions from the built source map

## Open these resources as needed

- `references/grounding-rules.md`
- `references/output-spec.md`
```

- [ ] **Step 3: Write `skills/paper-reader/README.md`**

```md
# Paper Reader

Creates bilingual, source-grounded reading artifacts for academic papers.

## Use it for

- full-paper reading
- figure-aware paper study notes
- source-grounded follow-up questions

## It does not do

- manuscript drafting
- citation export workflows
- reviewer response drafting
```

- [ ] **Step 4: Run targeted validation**

Run:

```bash
npm run validate
node -e 'const fs=require("fs"); console.log(fs.existsSync("skills/paper-reader/references/grounding-rules.md"))'
```

Expected: validator passes and the node command prints `true`.

- [ ] **Step 5: Commit**

```bash
git add skills/paper-reader
git commit -m "feat: migrate paper-reader skill package"
```

## Task 4: Migrate `paper-response`, `paper-paper2ppt`, and `paper-data`

**Files:**
- Create/modify: `skills/paper-response/**`
- Create/modify: `skills/paper-paper2ppt/**`
- Create/modify: `skills/paper-data/**`

- [ ] **Step 1: Copy the package resources**

Run:

```bash
cp -R nature-skills-main/skills/nature-response/{references,examples,tests} skills/paper-response/ 2>/dev/null || true
cp -R nature-skills-main/skills/nature-paper2ppt/{references,assets,examples,tests} skills/paper-paper2ppt/ 2>/dev/null || true
cp -R nature-skills-main/skills/nature-data/{references,assets,examples,tests} skills/paper-data/ 2>/dev/null || true
```

- [ ] **Step 2: Rewrite the three `SKILL.md` entrypoints**

Use these minimal entrypoints:

```md
---
name: paper-response
description: Use when the user needs point-by-point reviewer response drafting, rebuttal revision, or response-package QA for academic manuscript review cycles.
---

# Paper Response

Use package-local references to structure editor instructions, reviewer comments, action mapping, and response QA.
```

```md
---
name: paper-paper2ppt
description: Use when the user needs to convert an academic paper into a presentation or journal-club slide workflow.
---

# Paper to PPT

Use package-local references and assets to convert paper content into a slide-oriented outline and deck workflow.
```

```md
---
name: paper-data
description: Use when the user needs data availability statements, FAIR-aligned data declarations, repository planning, or identifier guidance for academic papers.
---

# Paper Data

Use package-local references to draft and review data statements and FAIR-oriented data-sharing materials.
```

- [ ] **Step 3: Write the three `README.md` files**

Write short product-facing READMEs following the same template:

```md
# Paper Response

Handles academic reviewer response and rebuttal workflows.

## Use it for

- reviewer comment triage
- point-by-point response drafting
- response QA
```

Mirror that structure for `Paper to PPT` and `Paper Data` with task-specific bullets.

- [ ] **Step 4: Run targeted validation**

Run:

```bash
npm run validate
node -e '["paper-response","paper-paper2ppt","paper-data"].forEach(n=>console.log(n, require("fs").existsSync(`skills/${n}/README.md`)))'
```

Expected: validator passes and the node command prints `true` for all three packages.

- [ ] **Step 5: Commit**

```bash
git add skills/paper-response skills/paper-paper2ppt skills/paper-data
git commit -m "feat: migrate response, paper2ppt, and data skill packages"
```

## Task 5: Rebuild `paper-figure` from `nature-figure` plus thesis conventions

**Files:**
- Create/modify: `skills/paper-figure/SKILL.md`
- Create/modify: `skills/paper-figure/README.md`
- Copy/modify: `skills/paper-figure/references/**`

- [ ] **Step 1: Copy the upstream figure package**

Run:

```bash
cp -R nature-skills-main/skills/nature-figure/references skills/paper-figure/
[ -d nature-skills-main/skills/nature-figure/assets ] && cp -R nature-skills-main/skills/nature-figure/assets skills/paper-figure/ || true
```

- [ ] **Step 2: Add thesis-specific figure/table references**

Create `skills/paper-figure/references/thesis-chart-table-rules.md` with:

```md
# Thesis Chart and Table Rules

- use three-line tables by default
- place table titles above tables
- place figure captions below figures
- keep figure, table, and text references consistent
- do not use AI-generated visuals for experimental results
```

- [ ] **Step 3: Rewrite the entrypoint and README**

`SKILL.md`:

```md
---
name: paper-figure
description: Use when the user needs academic figures, publication plots, chart QA, or thesis-oriented chart and table conventions.
---

# Paper Figure

Use this skill for scientific figure production and thesis-oriented chart/table quality rules.

## Open these resources as needed

- `references/design-theory.md`
- `references/figure-contract.md`
- `references/thesis-chart-table-rules.md`
```

`README.md`:

```md
# Paper Figure

Builds scientific figures and enforces thesis-oriented chart and table conventions.
```

- [ ] **Step 4: Run targeted validation**

Run:

```bash
npm run validate
node -e 'const fs=require("fs"); console.log(fs.existsSync("skills/paper-figure/references/thesis-chart-table-rules.md"))'
```

Expected: validator passes and the node command prints `true`.

- [ ] **Step 5: Commit**

```bash
git add skills/paper-figure
git commit -m "feat: rebuild paper-figure with thesis chart rules"
```

## Task 6: Rebuild `paper-literature` from search, citation, and thesis citation rules

**Files:**
- Create/modify: `skills/paper-literature/SKILL.md`
- Create/modify: `skills/paper-literature/README.md`
- Copy/modify: `skills/paper-literature/references/**`
- Copy/modify: `skills/paper-literature/scripts/**`

- [ ] **Step 1: Copy both upstream package resources**

Run:

```bash
cp -R nature-skills-main/skills/nature-academic-search/references skills/paper-literature/
cp -R nature-skills-main/skills/nature-academic-search/scripts skills/paper-literature/
cp -R nature-skills-main/skills/nature-citation/references skills/paper-literature/references-nature-citation
cp nature-skills-main/skills/nature-citation/scripts/nature_citation.py skills/paper-literature/scripts/citation_mapper.py
cp thesis-writer/scripts/ref-search.ts skills/paper-literature/scripts/ref-search.ts
cp thesis-writer/references/gbt7714.md skills/paper-literature/references/
cp thesis-writer/references/citation-rules.md skills/paper-literature/references/
```

- [ ] **Step 2: Normalize citation-specific references into the main reference tree**

Run:

```bash
cp skills/paper-literature/references-nature-citation/*.md skills/paper-literature/references/
rm -rf skills/paper-literature/references-nature-citation
```

Expected: a single `references/` tree contains both search and citation guidance.

- [ ] **Step 3: Rewrite the entrypoint and README**

`SKILL.md`:

```md
---
name: paper-literature
description: Use when the user needs literature search, citation verification, claim-to-reference mapping, reference export, or thesis and journal citation workflows.
---

# Paper Literature

Use this skill for literature search, citation verification, reference export, and claim-support mapping.

## Core responsibilities

- search literature across supported academic sources
- verify candidate references against specific claims
- export usable citation files
- support Chinese thesis citation rules and high-impact manuscript citation workflows

## Open these resources as needed

- `references/source-tiers.md`
- `references/search-strategy.md`
- `references/gbt7714.md`
- `references/citation-rules.md`
```

`README.md`:

```md
# Paper Literature

Handles literature search, citation verification, and reference export for academic workflows.
```

- [ ] **Step 4: Run targeted validation**

Run:

```bash
npm run validate
node -e 'const fs=require("fs"); ["skills/paper-literature/scripts/ref-search.ts","skills/paper-literature/scripts/citation_mapper.py","skills/paper-literature/references/gbt7714.md"].forEach(p=>console.log(p, fs.existsSync(p)))'
```

Expected: validator passes and all three files print `true`.

- [ ] **Step 5: Commit**

```bash
git add skills/paper-literature
git commit -m "feat: rebuild literature and citation skill package"
```

## Task 7: Rebuild `paper-manuscript-writing` from writing, polishing, and thesis writing rules

**Files:**
- Create/modify: `skills/paper-manuscript-writing/SKILL.md`
- Create/modify: `skills/paper-manuscript-writing/README.md`
- Copy/modify: `skills/paper-manuscript-writing/references/**`
- Copy/modify: `skills/paper-manuscript-writing/examples/**`
- Copy/modify: `skills/paper-manuscript-writing/scripts/**`

- [ ] **Step 1: Copy upstream writing and polishing resources**

Run:

```bash
cp -R nature-skills-main/skills/nature-writing/references skills/paper-manuscript-writing/
cp -R nature-skills-main/skills/nature-writing/README.md skills/paper-manuscript-writing/README.upstream-writing.md
cp -R nature-skills-main/skills/nature-polishing/references skills/paper-manuscript-writing/references-nature-polishing
cp -R nature-skills-main/skills/nature-writing/references/examples skills/paper-manuscript-writing/
cp thesis-writer/references/academic-writing-rules.md skills/paper-manuscript-writing/references/
cp thesis-writer/references/academic-humanizer-zh.md skills/paper-manuscript-writing/references/
cp thesis-writer/references/plagiarism-strategy.md skills/paper-manuscript-writing/references/
cp thesis-writer/references/thesis-structure.md skills/paper-manuscript-writing/references/
cp thesis-writer/references/undergraduate-quality-gate.md skills/paper-manuscript-writing/references/
cp thesis-writer/references/abstract-writing.md skills/paper-manuscript-writing/references/
```

- [ ] **Step 2: Fold polishing references into the main reference tree**

Run:

```bash
cp skills/paper-manuscript-writing/references-nature-polishing/*.md skills/paper-manuscript-writing/references/
rm -rf skills/paper-manuscript-writing/references-nature-polishing
```

- [ ] **Step 3: Preserve thesis engineering scripts as non-primary attached capabilities**

Run:

```bash
cp thesis-writer/scripts/{check-deps.ts,export.ts,import.ts,parse-template.ts,version.ts} skills/paper-manuscript-writing/scripts/
```

Expected: thesis DOCX engineering scripts are preserved but attached to the writing package rather than exposed as a separate public skill.

- [ ] **Step 4: Rewrite the entrypoint and README**

`SKILL.md`:

```md
---
name: paper-manuscript-writing
description: Use when the user needs academic manuscript drafting, restructuring, polishing, de-AI rewriting, thesis-oriented writing support, or quality-gate review.
---

# Paper Manuscript Writing

Use this skill for manuscript creation and rewriting across English research papers and Chinese thesis-oriented writing.

## Core responsibilities

- draft and restructure manuscript sections
- polish and de-AI rewrite prose
- support thesis-style chapter development
- apply plagiarism-reduction and thesis quality-gate rules

## Open these resources as needed

- `references/article-architecture.md`
- `references/academic-writing-rules.md`
- `references/academic-humanizer-zh.md`
- `references/plagiarism-strategy.md`
- `references/thesis-structure.md`
- `references/undergraduate-quality-gate.md`
```

`README.md`:

```md
# Paper Manuscript Writing

Handles manuscript drafting, restructuring, polishing, de-AI rewriting, and thesis-oriented writing support.
```

- [ ] **Step 5: Run targeted validation and commit**

Run:

```bash
npm run validate
node -e 'const fs=require("fs"); ["skills/paper-manuscript-writing/scripts/import.ts","skills/paper-manuscript-writing/references/academic-humanizer-zh.md","skills/paper-manuscript-writing/references/article-architecture.md"].forEach(p=>console.log(p, fs.existsSync(p)))'
git add skills/paper-manuscript-writing
git commit -m "feat: rebuild manuscript writing skill package"
```

Expected: validator passes, all three file checks print `true`, and the commit succeeds.

## Task 8: Expand plugin-level validation scripts

**Files:**
- Modify: `scripts/validate-plugin.mjs`
- Create: `scripts/validate-skills.mjs`
- Create: `scripts/check-links.mjs`
- Create: `scripts/check-no-upstream-leaks.mjs`
- Create: `scripts/inventory-skills.mjs`

- [ ] **Step 1: Tighten `validate-plugin.mjs`**

Add checks for:

- `interface.longDescription`
- `interface.category`
- `interface.capabilities`
- max three `defaultPrompt` entries

Core code to add:

```js
if (!Array.isArray(manifest.interface.defaultPrompt) || manifest.interface.defaultPrompt.length > 3) {
  fail("interface.defaultPrompt must be an array with at most 3 entries");
}
```

- [ ] **Step 2: Create `scripts/validate-skills.mjs`**

Use this starter implementation:

```js
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const skillsDir = join(root, "skills");
let failed = false;

for (const name of readdirSync(skillsDir)) {
  const dir = join(skillsDir, name);
  if (!statSync(dir).isDirectory()) continue;
  for (const required of ["SKILL.md", "README.md", "references"]) {
    if (!existsSync(join(dir, required))) {
      console.error(`ERROR: ${name} missing ${required}`);
      failed = true;
    }
  }
  const skillText = readFileSync(join(dir, "SKILL.md"), "utf8");
  for (const banned of ["nature-skills-main/", "thesis-writer/"]) {
    if (skillText.includes(banned)) {
      console.error(`ERROR: ${name} still references ${banned}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log("Skill packages are structurally valid.");
```

- [ ] **Step 3: Create `scripts/check-links.mjs` and `scripts/check-no-upstream-leaks.mjs`**

`scripts/check-links.mjs` starter:

```js
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const files = globSync("skills/**/{SKILL,README}.md");
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const matches = [...text.matchAll(/`([^`]+\\.(md|ts|py))`/g)];
  console.log(file, matches.length);
}
```

`scripts/check-no-upstream-leaks.mjs` starter:

```js
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const banned = ["微信群", "nature-skills", "thesis-writer", "Claude Code", "cp -R skills/nature-"];
let failed = false;

for (const file of globSync("{README.md,skills/**/README.md,skills/**/SKILL.md,docs/**/*.md}")) {
  const text = readFileSync(file, "utf8");
  for (const needle of banned) {
    if (text.includes(needle) && !file.includes("migration-notes")) {
      console.error(`ERROR: ${file} contains banned text: ${needle}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log("No upstream product leakage found.");
```

- [ ] **Step 4: Create `scripts/inventory-skills.mjs`**

Use:

```js
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const skills = readdirSync(join(root, "skills")).sort().map((name) => {
  const text = readFileSync(join(root, "skills", name, "SKILL.md"), "utf8");
  const description = text.match(/^description:\s*(.+)$/m)?.[1] ?? "";
  return { name, description };
});

console.log(JSON.stringify(skills, null, 2));
```

- [ ] **Step 5: Run all validation scripts and commit**

Run:

```bash
npm run validate
node scripts/validate-skills.mjs
node scripts/check-links.mjs
node scripts/check-no-upstream-leaks.mjs
node scripts/inventory-skills.mjs
git add scripts
git commit -m "chore: add plugin-level validation and inventory scripts"
```

Expected: all validators pass, `inventory-skills.mjs` prints a JSON list of the seven skills, and the commit succeeds.

## Task 9: Final cleanup, release audit, and source-archive decision

**Files:**
- Modify: `README.md`
- Modify: `docs/migration-notes.md`
- Optionally move or delete: `nature-skills-main/`
- Optionally move or delete: `thesis-writer/`

- [ ] **Step 1: Add a migration-complete checklist**

Append to `docs/migration-notes.md`:

```md
## Final cleanup checklist

- [ ] all seven public skills exist
- [ ] no placeholder skill remains
- [ ] README is product-facing
- [ ] validators pass
- [ ] upstream source directories are either archived or intentionally retained
```

- [ ] **Step 2: Decide how to handle source directories**

Choose one path and apply it explicitly:

```bash
mkdir -p archive
mv thesis-writer archive/
mv nature-skills-main archive/
```

or keep them in place and add this note to `docs/migration-notes.md`:

```md
Source directories remain in-repo temporarily as migration evidence and should not be treated as public plugin surface.
```

- [ ] **Step 3: Run the full release audit**

Run:

```bash
npm run validate
node scripts/validate-skills.mjs
node scripts/check-links.mjs
node scripts/check-no-upstream-leaks.mjs
```

Expected: all checks pass with no errors.

- [ ] **Step 4: Review final file inventory**

Run:

```bash
find skills -maxdepth 2 -type f | sort
```

Expected: all seven skill packages have `SKILL.md` and `README.md`, with supporting directories populated according to their migration scope.

- [ ] **Step 5: Commit the release-ready reorganization**

```bash
git add README.md docs skills scripts .codex-plugin/plugin.json archive
git commit -m "feat: restructure plugin into publishable academic paper workflow packages"
```

If `archive/` was not used, omit it from `git add`.

## Self-Review Notes

### Spec coverage

- plugin model covered in Tasks 1 and 2
- seven-skill public surface covered in Tasks 1, 3, 4, 5, 6, and 7
- directory-level migration covered in Tasks 3 through 7
- implementation batches reflected in task order
- release-facing docs and manifest covered in Task 2 and Task 9
- validation strategy covered in Task 8 and Task 9

### Placeholder scan

- no `TODO`, `TBD`, or "implement later" placeholders are used in the task instructions
- all code-modifying steps include concrete content or exact commands

### Type consistency

- public skill names are consistent across all tasks:
  - `paper-reader`
  - `paper-manuscript-writing`
  - `paper-literature`
  - `paper-response`
  - `paper-paper2ppt`
  - `paper-figure`
  - `paper-data`

