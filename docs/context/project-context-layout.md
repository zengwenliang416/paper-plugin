# Project Context Layout

This document describes the project-local context layer used by Paper Plugin.

## Directory

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
    people.yaml
  ledgers/
    evidence.tsv
    figures.tsv
    citations.tsv
    docx.tsv
    reviewer-comments.jsonl
    data-availability.yaml
  indexes/
    by-path.json
    by-hash.json
    by-anchor.json
  logs/
    events.jsonl
  runs/
  checkpoints/
  diffs/
  snapshots/
  cache/
    extracted-text/
    thumbnails/
    ooxml-scan/
  private.json
```

## Ownership

- `paper-workflow-router` reads context state for routing and lane order.
- `paper-manuscript-writing` owns source-of-truth intake, project context,
  version pointers, material registry, and claim ledgers.
- Other `paper-*` skills consume context and write lane-specific ledgers only.

## Source of truth

`.paper-context/` is an overlay. It does not replace:

- `thesis.yaml`
- `content/`
- `assets/`
- `format/`
- `output/`
- `.thesis.json`
- `paper.md`
- `source_map.json`

Context files store paths, hashes, status, and decisions. Original documents,
data, code, screenshots, DOCX XML, and rendered output remain the authoritative
evidence.

## Version files

`.thesis.json` remains the export/tag index maintained by `version.ts`.

`.paper-context/versions.yaml` stores semantic project state:

- current version
- active version
- next version
- dirty flag
- frozen/superseded/archived/deprecated version states

## Privacy

Committed context should use project-relative paths. Local absolute paths belong
only in ignored local files such as `.paper-context/private.json`.
