---
name: paper-manuscript-writing
description: Use when the user needs academic manuscript drafting, restructuring, polishing, de-AI rewriting, thesis-oriented writing support, quality-gate review, or source-of-truth intake for local thesis/project context before writing.
---

# Paper Manuscript Writing

Use this skill for manuscript drafting, restructuring, polishing, and thesis-oriented writing guidance across English research papers and Chinese graduation theses.

## Core responsibilities

- draft and restructure manuscript sections
- inspect thesis project materials before drafting
- own project context intake, `.paper-context/` updates, source hierarchy, version pointers, and claim ledgers for thesis/project writing work
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
- `references/thesis-project-intake.md`
- `references/thesis-claim-audit.md`
- `references/project-context-system.md`
- `references/project-versioning.md`
- `references/context-quality-gates.md`
- `references/aigc-report-rewrite.md`
- `references/mixed-delivery-boundary.md`
- `references/design-thesis-workflow.md`
- `references/undergraduate-quality-gate.md`
- `references/material-passport.md`
- `references/experiment-records.md`
- `references/examples/index.md`

## Package boundary

Primary scope is manuscript writing work: drafting, restructuring, polishing, and thesis writing guidance.

Attached scripts under `scripts/` support thesis engineering workflows such as project import/export, template parsing, dependency checks, and version tagging. They are bundled support tooling, not the package's main product surface.

For project-level thesis work, prefer the context manager before large drafting:

```bash
npx tsx scripts/context.ts init <project-dir>
npx tsx scripts/context.ts validate <project-dir> --gate pre-write
```

For Chinese graduation-thesis DOCX delivery, prefer the bundled export path over raw Pandoc:

```bash
npx tsx scripts/export.ts <project-dir> -o <output.docx>
```

The exporter applies `filters/thesis.lua` and `scripts/postprocess-docx.ts` by default so a missing school template still produces a usable generic thesis layout. If an official school template exists, put it at `format/reference.docx` or pass `--reference-doc`.

After any final DOCX export, route the output through `paper-docx-repair` render QA before delivery:

```bash
npx tsx skills/paper-docx-repair/scripts/render-docx.ts <output.docx> --output-dir <render-dir>
```

For `.paper-context/` projects, archive delivery requires a verified `ledgers/docx.tsv` row with checked page PNGs.

Out of scope for this package:

- literature search, reading plans, and reference-management workflows
- reviewer response drafting
- presentation or defense deck generation
