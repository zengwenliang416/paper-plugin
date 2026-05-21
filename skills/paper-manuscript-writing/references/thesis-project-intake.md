# Thesis Project Intake

Use this when a thesis task starts from a local folder, existing drafts, task books, teacher comments, school templates, or mixed project/code materials. The goal is to decide what can be written safely before drafting.

## Intake before writing

1. Identify the project boundary. Check whether the folder already has `thesis.yaml`, `content/`, `assets/`, `output/`, `format/`, `.thesis.json`, or an existing export pipeline.
2. Inventory local sources: task book, opening-report template, literature-review template, school specification, teacher-commented draft, sample thesis, code, data, screenshots, drawings, figures, videos, and prior outputs.
3. Extract source text from PDF/DOC/DOCX before relying on filenames. Record extraction failures instead of guessing the contents.
4. Separate source types:
   - authority: user prompt, current title, task book, teacher comments, school template, real data, real code, real images
   - reusable scaffolding: sample thesis, older drafts, generic templates
   - weak material: unverified references, AI-looking task-book references, screenshots without source context

## Title and material mismatch

If the folder title, user-stated title, task book, sample thesis, opening report, or reference PDFs point to different topics:

- keep the user's current title and explicit scope as the authority
- reuse only structure, formatting, shared academic moves, and truly overlapping evidence
- do not copy scenario wording, objects, metrics, experiment claims, or module names from mismatched samples
- return a short "usable / not usable / needs rewrite" boundary before drafting

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

## Drafting rules

- Opening reports and literature reviews should follow the local template structure when a template exists.
- Generate Markdown as the editable source, then export to DOCX when delivery requires Word.
- Avoid Markdown headings like `1.` or `2.` when the DOCX exporter may parse them as ordered lists; use full-width forms such as `（1）` when the template expects text headings.
- When teacher comments are present, map each comment to the affected section and state whether it changes content, evidence, format, or figures.
- After large text rewrites, re-check equations, figure/table references, citation numbering, and terminology consistency.

## Delivery notes

Always distinguish:

- content complete vs. format verified
- source rewritten vs. exported document repaired
- verified evidence vs. partially verified evidence
- final deliverable vs. framework draft with remaining TODOs
