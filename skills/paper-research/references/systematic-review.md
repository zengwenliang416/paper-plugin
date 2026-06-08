# Systematic Literature Review (PRISMA-lite)

Synthesize many papers into a structured review — **cluster and integrate, do not list**.

## Steps

1. **Search** — define the query and sources (use `paper-literature` wf1 multi-source search); record the strategy so it is reproducible.
2. **Screen** — apply inclusion/exclusion criteria (year range, venue tier, relevance); record counts (found → screened → included).
3. **Cluster** — group included papers by theme / method / dataset / scenario (not by author).
4. **Synthesize per cluster** — for each cluster: the shared approach, what differs, what is settled, what is contested. One integrated paragraph per cluster, each citation doing work.
5. **Relate** — connect each cluster back to the current research question.

## Anti-patterns

- Author-by-author enumeration ("X did…; Y did…") instead of thematic synthesis.
- Citing papers that do not advance the paragraph's logic.
- A review that does not end pointing at a gap.

## Output

A clustered review skeleton: `theme → included papers → synthesis-paragraph slot`, suitable for the related-work section. `scripts/review-outline.ts` builds the skeleton from a bib; the model fills the synthesis. Verify the included papers with `paper-literature/verify-refs.ts` before trusting the review.
