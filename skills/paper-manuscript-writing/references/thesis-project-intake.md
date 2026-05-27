# Thesis Project Intake

Use this when a thesis task starts from a local folder, existing drafts, task books, teacher comments, school templates, or mixed project/code materials. The goal is to decide what can be written safely before drafting.

## Intake before writing

When the user says "先看看当前项目有什么", "根据当前材料写论文", "你先理解一下这个项目", or similar, treat the first response as intake-only. Do not draft full thesis prose until the project boundary, source hierarchy, draft state, and evidence gaps are known.

1. Identify the project boundary. Check whether the folder already has `thesis.yaml`, `content/`, `assets/`, `output/`, `format/`, `.thesis.json`, or an existing export pipeline.
2. Inventory local sources: task book, opening-report template, literature-review template, school specification, teacher-commented draft, sample thesis, code, data, screenshots, drawings, figures, videos, and prior outputs.
3. Extract source text from PDF/DOC/DOCX before relying on filenames. Record extraction failures instead of guessing the contents.
4. Separate source types:
   - authority: user prompt, current title, task book, teacher comments, school template, real data, real code, real images
   - reusable scaffolding: sample thesis, older drafts, generic templates
   - weak material: unverified references, AI-looking task-book references, screenshots without source context

For reusable project work, create or refresh `.paper-context/` with
`scripts/context.ts`. Record material inventory in `registry/sources.json`,
active/current/next versions in `versions.yaml`, and the continuation state in
`CURRENT.md`. If `.paper-context/` is absent, intake may be performed manually,
but do not claim the project has durable context until the context layer exists.

## Draft status triage

Before editing a thesis folder, classify the main draft:

| Draft state | Signals | Safe action |
| --- | --- | --- |
| pure template | placeholders, empty headings, no project evidence | fill structure only after intake |
| half draft | some chapters present, weak evidence, repeated generic prose | build gap table before expansion |
| mixed draft | copied sample sections mixed with current project material | separate reusable structure from wrong content |
| old draft | title, task book, or output differs from current user scope | use only after source-of-truth selection |
| final candidate | complete DOCX/PDF exists and user asks for fixes | preserve source, repair narrowly, verify output |

If multiple sources exist, name the editable source and the final deliverable source separately.

## Title and material mismatch

If the folder title, user-stated title, task book, sample thesis, opening report, or reference PDFs point to different topics:

- keep the user's current title and explicit scope as the authority
- reuse only structure, formatting, shared academic moves, and truly overlapping evidence
- do not copy scenario wording, objects, metrics, experiment claims, or module names from mismatched samples
- return a short "usable / not usable / needs rewrite" boundary before drafting

## Sample and old-draft reuse boundary

Samples and old drafts can provide:

- chapter order
- table shape
- wording moves such as background, method, result, limitation
- school-format examples

Samples and old drafts must not provide:

- current project facts
- experiment values
- screenshots or result claims
- module names, device names, scene descriptions, or conclusions
- reference authenticity

When the user wants an opening report or literature review, first extract the local template fields, order, teacher comments, student/title metadata, check rules, and naming requirements.

## Evidence ledger

Before expanding chapters or strengthening claims, create or mentally maintain a claim-to-source ledger:

| Claim type | Required support |
| --- | --- |
| system function | code, screenshots, task book, UI flow, test notes |
| experiment or simulation result | raw data, logs, plots, model files, screenshots, calculation notes |
| performance comparison | comparable baseline data and metric definitions |
| literature statement | verified reference and citation placement |
| format requirement | school template, school specification, teacher comment, or rendered DOCX evidence |

If support is missing, mark `[TODO]`, soften the claim, or write it as a plan/validation scope. Do not invent missing experiments, photos, code, data, or references.

For `.paper-context/` projects, persist this ledger in
`.paper-context/registry/claims.tsv` and link supporting materials through
`.paper-context/ledgers/evidence.tsv`, `figures.tsv`, `citations.tsv`, or
`data-availability.yaml` as appropriate.

## Drafting rules

- Opening reports and literature reviews should follow the local template structure when a template exists.
- Generate Markdown as the editable source, then export to DOCX when delivery requires Word.
- Avoid Markdown headings like `1.` or `2.` when the DOCX exporter may parse them as ordered lists; use full-width forms such as `（1）` when the template expects text headings.
- When teacher comments are present, map each comment to the affected section and state whether it changes content, evidence, format, or figures.
- When screenshot comments appear to reference another major, device, or project, mark them as possibly mismatched before applying them.
- When content is too short, create a chapter gap table and expand only from verified code, screenshots, tests, data, calculations, drawings, or references.
- When restructuring chapters, list the current structure, target structure, moved/deleted/new sections, and expected effects on figure, table, formula, citation, and export numbering.
- After large text rewrites, re-check equations, figure/table references, citation numbering, and terminology consistency.

## Delivery notes

Always distinguish:

- content complete vs. format verified
- source rewritten vs. exported document repaired
- verified evidence vs. partially verified evidence
- final deliverable vs. framework draft with remaining TODOs
