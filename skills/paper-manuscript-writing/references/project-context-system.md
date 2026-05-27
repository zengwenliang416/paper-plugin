# Project Context System

Use this when a paper or thesis task starts from a project folder, continues
previous work, changes source of truth, or needs durable context across writing,
references, figures, data, DOCX export, defense, or reviewer response.

## Ownership

`paper-manuscript-writing` owns project context for writing work:

- project boundary
- source hierarchy
- editable source
- final deliverable source
- material registry
- draft state
- evidence gaps
- claim ledger
- context run records
- semantic version pointers

Other skills may read this context and write their lane-specific ledgers:

- literature: citation and reference verification ledgers
- figure: visual evidence manifest
- data: data availability and source-data provenance
- DOCX repair: repair scans, backups, page-PNG render QA reports, and final delivery verification rows
- PPT: defense handoff, visual map, talk track, demo plan
- response: reviewer action tracker

## Required project layer

The context layer lives in `.paper-context/` and is an overlay. It does not
replace `thesis.yaml`, `content/`, `assets/`, `format/`, `output/`, or
`.thesis.json`.

Minimum files:

```text
.paper-context/
  context.yaml
  manifest.json
  versions.yaml
  CURRENT.md
  decisions.md
  registry/
    sources.json
    artifacts.json
    claims.tsv
    issues.tsv
  ledgers/
    evidence.tsv
    figures.tsv
    citations.tsv
    docx.tsv
  indexes/
    by-path.json
    by-hash.json
    by-anchor.json
  logs/
    events.jsonl
  runs/
  checkpoints/
  snapshots/
```

## Context before writing

Before major drafting, create or update:

- `registry/sources.json`: task book, opening report, old drafts, templates,
  teacher comments, code, data, screenshots, drawings, figures, and prior
  outputs.
- `registry/claims.tsv`: high-risk claims and support status.
- `registry/issues.tsv`: gaps, conflicts, missing sources, and blocked claims.
- `versions.yaml`: current, active, and next version pointers.
- `CURRENT.md`: next action, blockers, latest output, and current state.

If the project has no `.paper-context/`, perform intake first. Do not draft a
complete thesis from a folder whose source of truth and evidence state are not
known.

## Context is not evidence

Context files are indexes and ledgers. They are not the evidence source. When a
claim is important or contested, open the original file, source block, image,
data, code, log, reference, DOCX XML, or rendered page PNGs.

## DOCX final-delivery memory

For Word delivery, `.paper-context/ledgers/docx.tsv` is the durable context
bridge between manuscript export and DOCX repair. A final/archive version must
record the exact output path, DOCX package validity, renderer, page count,
checked PNG directory, reviewed pages, reviewer, timestamp, and notes.

Do not mark a DOCX version as archive-ready from XML scans, Markdown source, or
successful export alone.

## Session closeout

Every modifying session should update:

- `CURRENT.md`
- a `runs/RUN-<timestamp>.md` record
- `decisions.md` if a durable decision was made
- `versions.yaml` if version status changed
- a checkpoint when the work creates a new recoverable baseline
