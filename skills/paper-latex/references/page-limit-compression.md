# Page-Limit Compression

CS/ML venues enforce a **hard** page limit for the main text (e.g. NeurIPS/ICML
~9, CVPR/ICCV ~8, ACL ~8, AAAI ~7). One line over is a desk-reject risk. This note
is the *fit-to-limit* step for the English-submission track. It is **not** a
writing-quality guide — section rhetoric and prose patterns stay in
`paper-manuscript-writing` (`section-moves.md`, `published-article-patterns.md`).

## Principle

Compression raises **information density**; it does not delete evidence or weaken
claims. If a cut would drop support for a main claim, it is a *move*, not a
*delete* — relocate it, don't remove it.

## Strategy, in priority order

1. **Relocate, don't delete.** Most venues allow an unlimited appendix /
   supplementary. Move secondary ablations, extended proofs, hyperparameter
   tables, and extra qualitative examples there. The main text keeps only the
   evidence that backs the headline claims.
2. **Tighten figures/tables.** Merge sub-figures into one panel, cut whitespace
   and oversized legends, drop non-load-bearing columns, use vector graphics.
   Figures are usually the cheapest space to recover.
3. **Raise prose density.** Cut throat-clearing and historical preamble, merge
   sentences that do the same job (see the sentence-job labels in
   `published-article-patterns.md`), and write related work as thematic
   paragraphs rather than one-citation-per-sentence.
4. **Layout, carefully.** `\vspace` micro-adjustments and figure placement (`[t]`,
   `[h]`, wrapfig) are fair game. **Never** shrink margins, line spacing, or font
   below the template — reviewers and ACs check, and it is a desk-reject. If you
   are still over after steps 1–3, cut content, don't cheat layout.

## Order of operations

Draft complete → mark each block **core** (backs a main claim) vs **movable** →
relocate movable to appendix → tighten figures/prose → only then touch layout.
Compressing a half-written draft wastes effort; compress once the argument is whole.

## Boundary (integrity is preserved under compression)

- A claim in the main text may only rest on evidence present in the main text or
  appendix — never on content that was cut entirely. Re-run the claim/evidence
  check (`paper-manuscript-writing` `validateClaimEvidence`) after compressing.
- Citations are unchanged by compression; verification still goes through
  `paper-literature/verify-refs.ts`.
- After compression, re-run render QA (`references/render-qa.md`) — a draft that
  *fits* is not the same as one that still *reads* and *looks* right.
