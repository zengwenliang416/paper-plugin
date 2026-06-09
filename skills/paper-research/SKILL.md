---
name: paper-research
description: Use when the user needs research-front support before or around writing — formulating a focused research question (topic), building a systematic literature review across many papers (review), or analyzing research gaps. Pairs with paper-literature (search/verify) upstream and paper-manuscript-writing (drafting) downstream.
---

# Paper Research

Use this skill for the research front-end: turning a vague interest into a focused question (**topic**), synthesizing many papers into a structured review (**review**), and finding what is unsolved (**gap**). It does not search or verify references (that is `paper-literature`) and does not draft the manuscript (that is `paper-manuscript-writing`); it produces the research framing those steps consume.

## When to use

- "帮我把这个想法变成一个研究问题" — formulate a research question.
- "把这些文献做成综述" — synthesize a literature review from a set of papers.
- "这个方向还有什么没人做" — analyze research gaps.

## Workflow (topic → review → gap)

1. **Topic** — focus the question with `references/topic-socratic.md` (Socratic prompts, FINER/PICO).
2. **Review** — gather papers (via `paper-literature`), then organize and synthesize with `references/systematic-review.md`; `scripts/review-outline.ts` builds a clustered review skeleton from a bib.
3. **Gap** — derive unsolved problems with `references/gap-analysis.md`; map each gap to whether this work can fill it.

See `references/research-workflow.md` for sequencing and handoffs.

## Nature

The synthesis is an LLM task (reading and generalizing across papers). The bundled script only organizes **scaffolding** (clustering bib metadata into a review skeleton); the actual synthesis and gap reasoning are done by the model against the sources.

## Boundary

- Upstream: `paper-literature` finds and verifies references.
- Downstream: `paper-manuscript-writing` drafts (including the related-work section) from this framing.
- This skill owns research-framing artifacts, not the manuscript or the bibliography.

## Open as needed

- `references/topic-socratic.md`
- `references/systematic-review.md`
- `references/gap-analysis.md`
- `references/research-workflow.md`
