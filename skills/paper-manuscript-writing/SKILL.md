---
name: paper-manuscript-writing
description: Use when the user needs academic manuscript drafting, restructuring, polishing, de-AI rewriting, thesis-oriented writing support, or quality-gate review.
---

# Paper Manuscript Writing

Use this skill for manuscript drafting, restructuring, polishing, and thesis-oriented writing guidance across English research papers and Chinese graduation theses.

## Core responsibilities

- draft and restructure manuscript sections
- polish and de-AI rewrite prose
- guide thesis-style chapter development and quality-gate review
- apply plagiarism-reduction and thesis writing rules
- use the attached thesis engineering scripts only as support tooling for import/export/template/version workflows

## Open these resources as needed

- `references/article-architecture.md`
- `references/academic-writing-rules.md`
- `references/academic-humanizer-zh.md`
- `references/plagiarism-strategy.md`
- `references/thesis-structure.md`
- `references/design-thesis-workflow.md`
- `references/undergraduate-quality-gate.md`
- `references/examples/index.md`

## Package boundary

Primary scope is manuscript writing work: drafting, restructuring, polishing, and thesis writing guidance.

Attached scripts under `scripts/` support thesis engineering workflows such as project import/export, template parsing, dependency checks, and version tagging. They are bundled support tooling, not the package's main product surface.

For Chinese graduation-thesis DOCX delivery, prefer the bundled export path over raw Pandoc:

```bash
npx tsx scripts/export.ts <project-dir> -o <output.docx>
```

The exporter applies `filters/thesis.lua` and `scripts/postprocess-docx.ts` by default so a missing school template still produces a usable generic thesis layout. If an official school template exists, put it at `format/reference.docx` or pass `--reference-doc`.

Out of scope for this package:

- literature search, reading plans, and reference-management workflows
- reviewer response drafting
- presentation or defense deck generation
