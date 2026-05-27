---
name: paper-docx-repair
description: Use when the user needs existing DOCX thesis, report, or manuscript files repaired or validated without regenerating the document, including Word cross-references, table indentation, TOC levels, field formatting, OOXML checks, strict page-PNG render QA, or final DOCX delivery verification.
---

# Paper DOCX Repair

Use this skill for post-delivery DOCX engineering when the user already has a Word file and wants formatting fixed without rebuilding the whole thesis or report.

## Core responsibilities

- inspect the actual `.docx` package before changing it
- preserve the existing document by default: write a repaired copy or make an in-place backup first
- repair generic Word structure issues, not discipline-specific content
- validate `word/document.xml`, `word/styles.xml`, and `word/settings.xml` after repair
- treat school norms, screenshots, and rendered output as layout evidence
- enforce page-PNG render QA before final DOCX delivery claims
- record verified render evidence in `.paper-context/ledgers/docx.tsv` when project context exists

## Default workflow

1. Scan first unless the user explicitly asks for a direct repair.
2. Back up before any in-place edit.
3. Prefer OOXML-level targeted fixes over Markdown re-export when the DOCX is already formatted.
4. Use `scripts/repair-docx.ts` for deterministic fixes and a JSON report.
5. After repair, verify the DOCX opens as a ZIP package and inspect the reported counts.
6. Render the fixed DOCX into `page-<N>.png` files and inspect every page before claiming the document is visually clean.
7. If any page has clipping, overlap, bad tables, missing glyphs, image drift, or header/footer defects, fix and re-render.
8. For final delivery in a `.paper-context/` project, write a verified row to `ledgers/docx.tsv` only after the page PNGs were checked.

## Bundled script

```bash
npx tsx skills/paper-docx-repair/scripts/repair-docx.ts <file.docx> --scan
npx tsx skills/paper-docx-repair/scripts/repair-docx.ts <file.docx> -o <file-repaired.docx>
npx tsx skills/paper-docx-repair/scripts/repair-docx.ts <file.docx> --in-place
npx tsx skills/paper-docx-repair/scripts/render-docx.ts <file.docx> --output-dir <render-dir>
npx tsx skills/paper-docx-repair/scripts/render-docx.ts <file.docx> --output-dir <render-dir> --context-project <project-dir> --mark-reviewed --reviewer codex
```

`repair-docx.ts` supports:

- table paragraph first-line indent cleanup
- `REF` field `\* CHARFORMAT` normalization
- `TOC1` / `TOC2` / `TOC3` style normalization
- Word update-fields setting
- opt-in figure/table text reference conversion with `--fix-crossrefs`

`render-docx.ts` supports:

- isolated LibreOffice DOCX-to-PDF conversion
- PDF-to-PNG rasterization with `pdftoppm` or ImageMagick
- `render-report.json` output
- optional PDF retention with `--emit-pdf`
- optional `.paper-context/ledgers/docx.tsv` recording after visual review

## Open this resource as needed

- `references/docx-render-qa-contract.md`
- `references/ooxml-repair-rules.md`
- `references/thesis-docx-layout-qa.md`
- `references/thesis-layout-scan-contract.md`

## Boundaries

- Do not encode project-specific or discipline-specific content into this skill.
- Do not regenerate a user's formatted DOCX unless they ask for a fresh export.
- Do not silently overwrite the only copy of a document.
- Do not claim visual correctness from XML scans, text extraction, or successful export alone.
