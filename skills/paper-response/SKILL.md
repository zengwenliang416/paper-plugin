---
name: paper-response
description: Use when the user needs point-by-point reviewer response drafting, rebuttal revision, or response-package QA for academic manuscript review cycles.
---

# Paper Response

Use package-local references to structure editor instructions, reviewer comments, action mapping, and response QA.

## Readiness gate (deterministic)

`references/qa-checklist.md` defines a readiness gate (`ready_to_submit` /
`draft_with_placeholders` / `needs_author_input` / `blocked`).
`scripts/response-gate.ts` enforces it: build a response tracker (one record per
comment, shape in `references/action-mapping.md`) and run

    npx tsx scripts/response-gate.ts tracker.json

It exits non-zero unless the package is `ready_to_submit`. A declared readiness can
only be made worse by the evidence, never better — so a missing manuscript location,
an unanswered or untraceable comment, or a blocking item cannot be labelled ready.
Treat any non-`ready_to_submit` verdict as a hard block before delivering the package.
