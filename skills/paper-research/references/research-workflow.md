# Research Workflow (topic → review → gap)

Sequencing and handoffs for the research front-end.

## Sequence

1. **Topic** (`topic-socratic.md`) → 1–2 focused questions + scope.
2. **Search** → hand the question to `paper-literature` (wf1 multi-source search; `verify-refs.ts` to drop fabricated hits).
3. **Review** (`systematic-review.md`) → cluster + synthesize the included papers; `scripts/review-outline.ts` for the skeleton.
4. **Gap** (`gap-analysis.md`) → derive gaps from the review; pick 1–3.
5. **Handoff** → give the chosen gap + review to `paper-manuscript-writing` as the related-work + contribution framing.

## Enter mid-way

- Already have a question → start at Search/Review.
- Already have papers → start at Review.
- Already have a review → start at Gap.

## Boundaries

- Searching / verifying references = `paper-literature`.
- Drafting prose (including related-work) = `paper-manuscript-writing`.
- This skill only **frames** the research; it does not search, verify, or draft.
