# Thesis DOCX Layout QA

Use this when the user says the thesis Word format is wrong, sends a screenshot, asks to compare against a school specification, or points to table, figure, formula, TOC, page-number, indentation, line-spacing, or caption issues.

## Decide repair path

- If the user has an already formatted DOCX and wants a local fix, use `paper-docx-repair` and preserve the document with a backup or repaired copy.
- If the user wants regenerated output from Markdown/source, route the durable fix to the manuscript export pipeline: reference DOCX, Lua filter, or postprocess script.
- If a school template or school writing specification exists, treat it as the source of truth. Do not approximate style from memory.

## Evidence to inspect

Check real document artifacts, not only Markdown:

- `word/document.xml` for paragraphs, tables, captions, formulas, page breaks, and section breaks
- `word/styles.xml` for body, heading, TOC, caption, and table styles
- `word/settings.xml` for field refresh behavior
- `word/header*.xml` and `word/footer*.xml` for headers, footers, and page numbering
- `word/media/` and relationships for embedded images
- page PNG renders for all final DOCX delivery claims

## Common thesis layout checks

- cover fields are present and not duplicated
- abstract, table of contents, main text, references, acknowledgements, and appendices have the expected order
- main-text page numbering starts at the required section
- TOC levels and page numbers match the rendered document after layout-affecting fixes
- heading levels did not collapse or disappear
- body text uses the expected Chinese/Latin fonts, size, line spacing, first-line indent, and justification
- figure captions are below figures and table titles are above tables
- image-only paragraphs use the required spacing and do not create blank pages
- table cells do not carry unwanted first-line indentation
- three-line tables have only top, header-divider, and bottom borders unless the school template says otherwise
- formulas and formula numbers stay on the same line when required
- reference paragraphs use the requested first-line or hanging indent and match in-text citations

## Required render loop

For final DOCX delivery, follow `docx-render-qa-contract.md`:

1. Render the latest DOCX with `scripts/render-docx.ts`.
2. Inspect every generated `page-<N>.png`.
3. Fix visual defects and re-render.
4. Record a verified `.paper-context/ledgers/docx.tsv` row only after all page PNGs pass review.

Do not replace this with a package-only scan, extracted text check, or "Pandoc succeeded" statement.

## Validation report

After repair, report:

- target DOCX path and whether it was repaired in place or copied
- backup path if an in-place edit was used
- which XML parts or export scripts changed
- counts for the checked objects when available, such as table indent issues, TOC mismatches, broken media, formula-number issues, or citation mismatches
- whether ZIP integrity, page-PNG rendering, and full-page visual review passed

Do not claim visual correctness if only XML syntax, source Markdown, or DOCX package structure was checked.
