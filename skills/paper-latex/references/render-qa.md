# LaTeX Render QA (vision-in-loop)

Compile → rasterize → **inspect every page PNG**. The LaTeX-track parallel to `paper-docx-repair`'s DOCX render QA — a build that compiles is not the same as one that *looks* right.

## Run

```bash
# from a .tex (compiles with latexmk/pdflatex)
npx tsx skills/paper-latex/scripts/render-latex.ts main.tex --output-dir render/
# from an already-built PDF (skip compile)
npx tsx skills/paper-latex/scripts/render-latex.ts main.pdf --output-dir render/
```

Produces `page-<N>.png` + `render-report.json`. If compilation reported errors, the report sets `compileOk: false` and renders the partial PDF — diagnose first with `latex-diagnose.ts`.

## What to check per page

- **Math** renders (no broken/missing formulas, no stray `$`).
- **Figures/tables** placed and inside margins (cross-check `Overfull \hbox` from `latex-diagnose.ts`).
- **References/citations** resolved — no `?` or `[?]` marks.
- **Venue format** respected: margins, columns, and page limit.

## Pass rule

Visual QA passes **only after every `page-<N>.png` has been inspected**. Never claim QA on a partial render (`compileOk: false`) without first fixing the compile errors. This mirrors the DOCX rule: a successful export ≠ a verified layout.

## Dependency

`.tex` input needs a local TeX (`latexmk`/`pdflatex`); rasterization needs poppler (`pdftoppm`) or ImageMagick — just as the DOCX track needs LibreOffice. The plugin bundles neither.
