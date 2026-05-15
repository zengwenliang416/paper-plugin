# Paper Plugin Design

Date: 2026-05-15
Status: Draft for review
Scope: Codex-only plugin design for a publishable academic paper workflow product

## 1. Goal

Build a Codex plugin that absorbs the capabilities of:

- `thesis-writer/`
- `nature-skills-main/`

The result is not a side-by-side bundle of two legacy systems. It is one new product:

- Codex-only
- skills-first
- publishable
- oriented around the full academic paper lifecycle

The plugin should present a clean multi-skill surface to users while internally reorganizing overlapping capabilities from both source systems.

## 2. Product Positioning

The plugin is positioned as an academic paper full-stack plugin.

It should cover:

- paper reading
- manuscript writing and restructuring
- polishing and de-AI rewriting
- literature search and citation workflows
- reviewer response drafting
- paper-to-PPT workflows
- scientific figures and thesis chart/table conventions
- data availability and FAIR-style statement workflows

It should not present the product as:

- a thesis-only tool
- a Nature-only tool
- a wrapper over two upstream repositories

## 3. Plugin Model

The plugin uses the standard Codex plugin structure:

```text
paper-plugin/
├── .codex-plugin/
│   └── plugin.json
├── skills/
├── docs/
├── scripts/
└── assets/
```

Rules:

- `plugin.json` is the only plugin manifest.
- `skills/` contains only public, directly triggerable skills.
- each public skill is self-contained and carries its own references, scripts, and assets
- plugin-root `docs/`, `scripts/`, and `assets/` are plugin-level resources only

This design intentionally avoids a runtime-central `shared/` dependency as the main organization model. The goal is stable packaging, easy future extraction, and clear skill ownership.

## 4. Public Skill Surface

The final public plugin surface exposes seven skills:

```text
skills/
├── paper-reader/
├── paper-manuscript-writing/
├── paper-literature/
├── paper-response/
├── paper-paper2ppt/
├── paper-figure/
└── paper-data/
```

Rationale:

- public skills are organized by user task domain
- public skills are not organized by upstream repository identity
- overlapping legacy skill boundaries are collapsed into cleaner product boundaries

## 5. Skill Packaging Standard

Each public skill should follow this structure:

```text
skills/paper-<name>/
├── SKILL.md
├── README.md
├── references/
├── scripts/
├── assets/
├── examples/
├── tests/
└── agents/          # only when genuinely needed
```

Meaning of each component:

- `SKILL.md`: runtime routing, scope, workflow, and resource loading instructions
- `README.md`: product-facing explanation of what the skill does and does not do
- `references/`: writing rules, rubrics, templates, output contracts, citation rules, process notes
- `scripts/`: deterministic utilities actually used by the skill
- `assets/`: templates, images, sample files, CSL/filter/docx references, static examples
- `examples/`: representative inputs and output shapes
- `tests/`: smoke-level validation artifacts for the skill package
- `agents/`: optional sub-role material only if the skill truly needs it

## 6. Capability Reorganization

### 6.1 Core principle

`thesis-writer` is not preserved as a standalone public skill.

Instead, its capabilities are split and absorbed into the new public skills. `nature-*` is also not preserved as a visible family identity; it is absorbed into the new product structure.

### 6.2 Final mapping

#### `paper-manuscript-writing`

Absorbs:

- `nature-writing`
- `nature-polishing`
- selected writing-oriented capabilities from `thesis-writer`

Includes:

- manuscript drafting
- section restructuring
- English academic prose production
- polishing
- de-AI rewriting
- plagiarism-reduction strategy
- Chinese thesis writing logic
- undergraduate thesis quality gates
- chapter-level thesis structure guidance

From `thesis-writer`, absorb at least:

- `references/academic-writing-rules.md`
- `references/academic-humanizer-zh.md`
- `references/plagiarism-strategy.md`
- `references/thesis-structure.md`
- `references/undergraduate-quality-gate.md`
- `references/abstract-writing.md`

Does not own:

- primary citation search/export workflows
- figure production workflows
- reader/source-map workflows

#### `paper-literature`

Absorbs:

- `nature-academic-search`
- `nature-citation`
- citation-oriented capabilities from `thesis-writer`

Includes:

- literature search
- citation verification
- segment-to-reference mapping
- DOI/PMID/BibTeX/RIS workflows
- reference export
- Chinese thesis citation rules
- GB/T 7714 support
- citation landing audits

From `thesis-writer`, absorb at least:

- `scripts/ref-search.ts`
- `references/gbt7714.md`
- `references/citation-rules.md`
- citation-audit-relevant portions of `references/submission-checklist.md`

Does not own:

- main manuscript drafting flow
- figure/table production

#### `paper-figure`

Absorbs:

- `nature-figure`
- thesis chart/table conventions from `thesis-writer`

Includes:

- scientific figure workflow
- figure QA contracts
- thesis-oriented chart/table rules
- three-line table rules
- caption placement rules
- figure/table consistency checks

#### `paper-reader`

Absorbs primarily:

- `nature-reader`

Includes:

- source-grounded paper reading
- bilingual reading artifacts
- stable source anchors
- figure/table placement logic
- source-map-oriented follow-up answering

#### `paper-response`

Absorbs primarily:

- `nature-response`

Includes:

- reviewer comment segmentation
- response strategy
- point-by-point rebuttal drafting
- response QA and risk checks

#### `paper-paper2ppt`

Absorbs primarily:

- `nature-paper2ppt`

Includes:

- journal club or paper presentation workflows
- Chinese slide generation from paper content

#### `paper-data`

Absorbs primarily:

- `nature-data`

Includes:

- data availability statements
- FAIR-oriented checks
- repository and identifier guidance

## 7. Directory-Level Migration Plan

### `paper-manuscript-writing`

Build from:

- `nature-skills-main/skills/nature-writing/`
- `nature-skills-main/skills/nature-polishing/`
- selected `thesis-writer/references/`

Notes:

- rewrite `SKILL.md`
- rewrite `README.md`
- migrate examples from `nature-writing`
- keep thesis DOCX engineering scripts out of the core writing surface for now

### `paper-literature`

Build from:

- `nature-skills-main/skills/nature-academic-search/`
- `nature-skills-main/skills/nature-citation/`
- `thesis-writer/scripts/ref-search.ts`
- selected `thesis-writer/references/`

Notes:

- merge duplicate search/citation responsibilities under one public skill
- keep both Chinese thesis and high-impact manuscript citation conventions

### `paper-reader`

Build from:

- `nature-skills-main/skills/nature-reader/`

Notes:

- mostly whole-package migration
- rewrite only brand/product-facing docs and entry language

### `paper-response`

Build from:

- `nature-skills-main/skills/nature-response/`

Notes:

- mostly whole-package migration
- preserve references/examples/tests

### `paper-paper2ppt`

Build from:

- `nature-skills-main/skills/nature-paper2ppt/`

Notes:

- keep package mostly intact
- later allow conceptual coupling to `paper-reader` outputs without runtime hard dependency

### `paper-figure`

Build from:

- `nature-skills-main/skills/nature-figure/`
- selected thesis chart/table conventions from `thesis-writer`

### `paper-data`

Build from:

- `nature-skills-main/skills/nature-data/`

### Explicitly non-product materials to remove or rewrite

Remove or rewrite during migration:

- upstream recruitment text
-微信群/招募内容
- Claude-specific wrapper installation instructions
- upstream repo installation walkthroughs
- source-repo branding as primary product identity
- macOS `._*` metadata files

## 8. Implementation Batches

### Batch 0: skeleton and baseline

- create final public skill directories
- update plugin positioning in `plugin.json`
- remove/replace current placeholder skill
- keep `thesis-writer/` and `nature-skills-main/` untouched as migration source directories

### Batch 1: migrate independent packages

- `paper-reader`
- `paper-response`
- `paper-paper2ppt`
- `paper-data`

Purpose:

- establish the standard skill package template
- validate branding and cleanup workflow on low-overlap packages

### Batch 2: migrate `paper-figure`

Purpose:

- validate a mostly whole-package migration plus small cross-source rule augmentation

### Batch 3: rebuild `paper-literature`

Purpose:

- merge the search/citation overlap first
- stabilize citation and reference workflows before writing-layer integration

### Batch 4: rebuild `paper-manuscript-writing`

Purpose:

- do the heaviest overlap merge last
- avoid letting writing absorb all other responsibilities too early

### Batch 5: cleanup and release hardening

- remove or archive obsolete source directories
- clean leftover migration artifacts
- finish root README, screenshots, logo, release-facing docs
- expand plugin validation scripts

## 9. Manifest and Release-Facing Product Design

### Manifest identity

The plugin should be presented as a full-stack academic paper plugin, not as a generic paper helper.

Suggested public-facing identity:

- `displayName`: `Paper Plugin`
- `shortDescription`: academic paper reading, writing, citation, response, and figure workflows
- `longDescription`: a multi-skill academic paper workflow plugin covering reading, manuscript drafting, literature workflows, reviewer responses, figure preparation, paper-to-PPT, and data statements

### Default prompts

The first release should use three task-revealing prompts:

1. `Turn this paper into a source-grounded bilingual reader with figure anchors.`
2. `Draft or restructure this manuscript section and flag missing evidence.`
3. `Find supporting references for these claims and export usable citations.`

These expose:

- `paper-reader`
- `paper-manuscript-writing`
- `paper-literature`

### Root README

The root `README.md` should become a product landing page with:

1. what the plugin is
2. skill matrix
3. representative workflows
4. target users
5. install/use notes
6. local development and validation
7. repository structure
8. release/readiness notes

### Per-skill README

Each skill README should include:

1. what it does
2. when to use it
3. expected inputs
4. produced outputs
5. important references/scripts/assets
6. boundaries and non-goals

## 10. Validation Strategy

The existing plugin validator is not enough for this plugin shape. Validation should be expanded into four layers.

### 10.1 Manifest validation

Check:

- required plugin metadata
- valid `skills` path
- release-facing `interface` completeness
- icon/logo/screenshot paths
- default prompt count and shape

### 10.2 Skill package integrity

For each public skill:

- `SKILL.md` exists and has valid frontmatter
- `README.md` exists
- referenced folders exist when mentioned
- no unresolved references to migration-source directories remain

### 10.3 Content consistency

Check:

- all referenced files from `SKILL.md` exist
- README files no longer carry upstream installation/branding leakage
- no stale Claude wrapper instructions remain
- no old source-repo paths remain in public-facing content unless intentionally documented in migration docs

### 10.4 Lightweight behavior coverage

Each skill should retain at least smoke-level examples/tests that verify:

- examples exist
- resource contracts are intact
- expected output shapes are documented

### Suggested plugin-root scripts

```text
scripts/
├── validate-plugin.mjs
├── validate-skills.mjs
├── check-links.mjs
├── check-no-upstream-leaks.mjs
└── inventory-skills.mjs
```

## 11. Key Constraints and Decisions

- Codex-only plugin
- multi-skill direct exposure
- no legacy source identity in the public product surface
- no standalone `paper-thesis-writer` public skill
- `thesis-writer` is decomposed into other public task-domain skills
- each public skill is self-contained
- public boundaries are task-domain boundaries, not source-repo boundaries

## 12. Risks

### Risk 1: `paper-manuscript-writing` becomes too broad

Mitigation:

- migrate it last
- keep literature, reader, and figure boundaries explicit

### Risk 2: `paper-literature` becomes an overloaded search-and-export package

Mitigation:

- clearly separate search, verification, mapping, and export subsections in `SKILL.md`
- keep scripts and references categorized

### Risk 3: upstream leakage remains visible in release content

Mitigation:

- add explicit validation for upstream-branding and wrapper-text residue

### Risk 4: thesis DOCX engineering capability gets lost during decomposition

Mitigation:

- keep non-public engineering scripts preserved during migration
- attach them first to `paper-manuscript-writing/scripts/` until a later explicit extraction decision

## 13. Recommended Outcome

The best build path is:

- create a publishable Codex plugin
- expose seven task-domain public skills
- decompose `thesis-writer` into new skills rather than preserving it as a public unit
- collapse overlapping `nature-*` capabilities into cleaner product boundaries
- migrate in batches from independent packages to overlapping packages
- finish with release-grade docs and validation

This produces one coherent academic paper workflow product rather than a visible merger of two historical systems.
