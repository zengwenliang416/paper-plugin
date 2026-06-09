# LaTeX Export (Markdown → LaTeX via Pandoc)

Reuse the existing Pandoc pipeline to produce LaTeX, parallel to the DOCX export — no new export engine.

## Basic export

```bash
pandoc <input.md> -o <output.tex> --standalone
# with citations:
pandoc <input.md> -o <output.tex> --standalone --citeproc --bibliography refs.bib
```

- `--standalone` emits a full document (preamble + body). Drop it to get a **body-only fragment** to paste into a venue template.
- Math, figures, and tables carry over; confirm figure paths resolve.

## Venue submission

Most venues ship a `.cls` and a sample `main.tex`. Prefer fragment output (body only) pasted into the venue's `main.tex`, or pass `--template <venue-template.tex>`. See `venue-templates.md`.

## After export

Compile locally, route the log through `scripts/latex-diagnose.ts`, and verify citations with `paper-literature/verify-refs.ts` before submission.

## Boundary

This is the English-submission path. Chinese graduation theses stay on the DOCX export (`paper-manuscript-writing` + `paper-docx-repair`); the two tracks coexist.
