# DOCX Render QA Contract

Use this contract whenever Paper Plugin creates, edits, repairs, redlines, comments on, or delivers a `.docx` file.

## Non-negotiable gate

A DOCX is not final until the latest DOCX has been rendered into page PNGs and every page image has been visually checked.

XML scans, text extraction, Pandoc success, ZIP integrity, and "the file opens" are useful intermediate checks, but they do not prove layout quality. They can miss clipping, overlap, broken tables, missing glyphs, stale fields, image drift, bad headers/footers, and pagination problems.

## Default workflow

1. Edit or repair the DOCX with the narrowest reliable tool.
2. Render the resulting DOCX to `page-<N>.png` files.
3. Inspect every rendered page at normal reading scale before claiming the DOCX is clean.
4. Fix any visual defect and render again.
5. Record the final verified render in `.paper-context/ledgers/docx.tsv` when the project has `.paper-context/`.
6. Deliver only the requested DOCX unless the user explicitly asks for PDFs, PNGs, or QA intermediates.

## Rendering command

Prefer the bundled renderer:

```bash
npx tsx skills/paper-docx-repair/scripts/render-docx.ts <file.docx> --output-dir <render-dir>
```

For project-context tracking after the PNGs have actually been reviewed:

```bash
npx tsx skills/paper-docx-repair/scripts/render-docx.ts <file.docx> \
  --output-dir <render-dir> \
  --context-project <project-dir> \
  --mark-reviewed \
  --reviewer codex
```

Use `--emit-pdf` only when a PDF is useful for debugging or user-requested delivery. PNGs remain the visual QA gate.

## Context ledger fields

`.paper-context/ledgers/docx.tsv` should use this schema:

```text
output_path	package_valid	render_checked	status	renderer	page_count	png_dir	pdf_path	reviewed_pages	reviewer	checked_at	notes
```

Required final-delivery values:

- `output_path`: project-relative DOCX path.
- `package_valid`: `yes`.
- `render_checked`: `yes`.
- `status`: `verified`.
- `renderer`: renderer actually used, such as `libreoffice+pdftoppm`.
- `page_count`: positive integer.
- `png_dir`: directory containing `page-<N>.png` files for the checked render.
- `reviewed_pages`: `all` or the same number as `page_count`.
- `checked_at`: timestamp for the final checked render.

Rows with `status=rendered_unreviewed`, missing PNGs, or partial page review do not satisfy archive delivery.

## What render QA validates

Render QA is strong evidence for:

- page count and pagination
- clipping and overlap
- table width, borders, row breaks, and repeating header behavior
- figure placement and missing media
- font fallback and missing glyphs
- headers, footers, page numbers, and section transitions
- TOC and field-result appearance after renderer refresh

Render QA is not enough for:

- comment correctness, because headless PDF export may omit comments
- tracked-change semantics, because visible redlines do not prove OOXML intent
- citation authenticity
- source-data provenance
- plagiarism or AIGC reports

For those areas, combine render QA with the relevant Paper Plugin ledger or structural check.

## Failure handling

- If LibreOffice or the PDF-to-PNG backend is missing, report the missing dependency and do not claim visual correctness.
- If rendering fails, fix rendering before guessing at layout quality.
- If only a manual Word/WPS preview was possible, record it as an exception in notes, but do not treat it as the normal archive gate unless the user explicitly accepts that exception.
