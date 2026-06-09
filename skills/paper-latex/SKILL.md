---
name: paper-latex
description: Use when the user needs LaTeX for a paper — exporting a manuscript to LaTeX for English journal/conference submission (venue templates like IEEE/ACM/NeurIPS), or diagnosing LaTeX compile errors. Runs alongside the DOCX track; it does not replace DOCX for Chinese theses.
---

# Paper LaTeX

Use this skill for the **LaTeX track**: export a manuscript to LaTeX for submission, and diagnose LaTeX compile problems. It runs **alongside** the DOCX track — DOCX (`paper-manuscript-writing` export + `paper-docx-repair`) stays the path for Chinese graduation theses; LaTeX is for English journal/conference submission. **LaTeX does not replace DOCX.**

## When to use

- Export a draft to LaTeX for an IEEE/ACM/NeurIPS-style submission.
- Diagnose a LaTeX build that fails or misbehaves.

## A. Export (submission)

Reuse the existing **Pandoc** pipeline (Markdown → LaTeX); see `references/latex-export.md`. Adapt to a venue's `.cls`/template per `references/venue-templates.md` (templates are provided by the venue; this skill only wires them in, never redistributes them).

## B. Compile diagnostics

`scripts/latex-diagnose.ts` parses a build log (pdflatex/latexmk) and classifies common errors (undefined command/citation/reference, missing package/file, math-mode, runaway brace) with fixes — see `references/compile-diagnostics.md`. It **only parses the log**; building requires a local TeX install.

## Boundary

- Two tracks coexist: **DOCX = Chinese thesis** (manuscript / docx-repair), **LaTeX = English submission** (this skill). LaTeX never replaces DOCX.
- The plugin bundles no TeX distribution: export uses Pandoc, diagnostics parse logs.
- Verify citations with `paper-literature/verify-refs.ts` before submission regardless of track.

## Open as needed

- `references/latex-export.md`
- `references/venue-templates.md`
- `references/compile-diagnostics.md`
