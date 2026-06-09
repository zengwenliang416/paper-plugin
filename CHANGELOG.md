# Changelog

## Unreleased

## 0.2.0

### Added

- Added a deterministic reviewer-response readiness gate (`paper-response/scripts/response-gate.ts`) that turns the soft QA checklist into an enforced check (ready_to_submit / draft_with_placeholders / needs_author_input / blocked).
- Added source-locator output to citation verification (`paper-literature/scripts/verify-refs.ts`) for verified references (DOI / OpenAlex), emitted only for verified entries.
- Added a deterministic literature deduplication script (`paper-literature/scripts/dedup.ts`) implementing the dedup-engine spec (DOI key, title+author Jaccard fallback, merge preference).
- Added multi-source search and citation-discovery hooks, and registered `academic-search` (CNKI/discipline-aware) as the preferred external retriever alongside `paper-search-mcp`.
- Added page-limit compression guidance (`paper-latex/references/page-limit-compression.md`) for the English-submission track.
- Added systems/ML venue section moves (Design + Evaluation) alongside the IMRAD moves in `paper-manuscript-writing`.
- Added an adversarial (devil's advocate) review lens and editorial decision standards to `paper-review-panel`.
- Added a competitor feature-level diff record (`docs/competitor-feature-diff.md`).
- Added thesis project intake guidance for material inventory, title/material mismatch handling, evidence ledgers, and safe thesis drafting.
- Added thesis DOCX layout QA guidance for school-format checks, OOXML inspection, rendered-output validation, formulas, captions, page numbers, and three-line tables.
- Added thesis reference-integrity guidance for source verification, bibliography edits, citation renumbering, and in-place DOCX reference repair.
- Added thesis visual-evidence guidance for figures, charts, screenshots, generated images, formulas, and visual provenance.
- Added thesis defense deck guidance for slide planning, figure/video placement mapping, and cautious claim control.
- Added operational thesis claim-audit, AIGC report rewrite, and mixed thesis/project delivery-boundary references.
- Added DOCX layout scan, reference-audit, visual-evidence manifest, and defense demo-video handoff contracts with manual contract tests.
- Added `paper-workflow-router` for automatic paper-plugin skill selection, mixed-lane routing, and out-of-scope detection.
- Added project context-system implementation plan, `.paper-context` contracts, semantic versioning guidance, lifecycle routing references, and manuscript context ownership guidance.
- Added `context.ts` project context CLI with `init`, `load`, `update`, `validate`, and `snapshot` commands.
- Added synthetic context fixtures and `validate:context` coverage for context shape, stale output, missing claim evidence, dangling citations, AI-image evidence, data provenance, DOCX render verification, and privacy gates.
- Added a strict DOCX page-PNG render QA contract and `paper-docx-repair/scripts/render-docx.ts` for LibreOffice-backed DOCX visual verification.

### Changed

- Narrowed local link scanning so virtual DOCX package paths and project-local example paths are not treated as repository links.
- Strengthened thesis intake, quality-gate, OOXML repair, reference-integrity, visual-evidence, and defense-deck routing rules from the Job session audit.
- Extended `npm run validate` with a deterministic router contract test.
- Extended `npm run validate` with deterministic project-context contract tests.
- Connected manuscript import/export/version scripts to `.paper-context` initialization, pre-export validation, snapshots, and version checkpoints while preserving legacy projects without context.
- Strengthened final DOCX archive gates so verified delivery requires package validity, rendered page PNGs, all-page review, and a traceable `ledgers/docx.tsv` row.
