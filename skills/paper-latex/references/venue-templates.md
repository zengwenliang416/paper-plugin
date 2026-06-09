# Venue Templates (IEEE / ACM / NeurIPS / …)

Conference and journal templates are provided by the venue (a `.cls` plus a sample `main.tex`). This skill wires a manuscript into them; it does **not** redistribute templates.

## Workflow

1. Get the official template from the venue (e.g. `IEEEtran`, `acmart`, `neurips_2024.sty`). Keep its license/notice intact.
2. Export the manuscript **body** (Pandoc fragment — see `latex-export.md`).
3. Paste the body into the template's `main.tex`; map title / author / abstract to the template's macros.
4. Set the document class options the venue requires, e.g. `\documentclass[conference]{IEEEtran}`, `\documentclass[sigconf]{acmart}`.
5. Compile and diagnose (`compile-diagnostics.md`).

## Common gotchas

- Author/affiliation macros differ per class (`IEEEtran` `\author` vs `acmart` `\author`+`\affiliation`).
- Bibliography style is venue-fixed (`IEEEtran.bst`; acmart `ACM-Reference-Format`).
- Page/format limits are enforced at submission — check before finalizing.

## Boundary

Templates and their styles are external and licensed by the venue; we only adapt content into them and never bundle a venue's files in this repo.
