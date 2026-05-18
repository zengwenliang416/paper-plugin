---
name: paper-docx-repair
description: Use when the user needs existing DOCX thesis, report, or manuscript files repaired or validated without regenerating the document, including Word cross-references, table indentation, TOC levels, field formatting, OOXML checks, or render QA.
---

# Paper DOCX Repair

Use this skill for post-delivery DOCX engineering when the user already has a Word file and wants formatting fixed without rebuilding the whole thesis or report.

## Core responsibilities

- inspect the actual `.docx` package before changing it
- preserve the existing document by default: write a repaired copy or make an in-place backup first
- repair generic Word structure issues, not discipline-specific content
- validate `word/document.xml`, `word/styles.xml`, and `word/settings.xml` after repair
- render or preview the fixed DOCX when the environment has LibreOffice or another reliable renderer

## Default workflow

1. Scan first unless the user explicitly asks for a direct repair.
2. Back up before any in-place edit.
3. Prefer OOXML-level targeted fixes over Markdown re-export when the DOCX is already formatted.
4. Use `scripts/repair-docx.ts` for deterministic fixes and a JSON report.
5. After repair, verify the DOCX opens as a ZIP package and inspect the reported counts.
6. If visual formatting matters, render pages and inspect the directory, cross-reference, figure/table, and table-heavy pages.

## Bundled script

```bash
npx tsx skills/paper-docx-repair/scripts/repair-docx.ts <file.docx> --scan
npx tsx skills/paper-docx-repair/scripts/repair-docx.ts <file.docx> -o <file-repaired.docx>
npx tsx skills/paper-docx-repair/scripts/repair-docx.ts <file.docx> --in-place
```

The script supports:

- table paragraph first-line indent cleanup
- `REF` field `\* CHARFORMAT` normalization
- `TOC1` / `TOC2` / `TOC3` style normalization
- Word update-fields setting
- opt-in figure/table text reference conversion with `--fix-crossrefs`

## Open this resource as needed

- `references/ooxml-repair-rules.md`

## Boundaries

- Do not encode project-specific or discipline-specific content into this skill.
- Do not regenerate a user's formatted DOCX unless they ask for a fresh export.
- Do not silently overwrite the only copy of a document.
