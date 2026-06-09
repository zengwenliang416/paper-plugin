# Systems / ML Venue Section Moves (Design + Evaluation)

`section-moves.md` covers the **IMRAD / Nature** structure (Methods → Results →
Discussion). CS systems and ML conferences (SIGCOMM, NSDI, OSDI, NeurIPS, ICML,
CVPR) instead use a **Design → Evaluation** structure. Pick the structure by venue
*before* drafting; this file is the Design/Evaluation counterpart to the IMRAD
moves. Section rhetoric only — claim/evidence integrity still goes through
`validateClaimEvidence` (`context-quality-gates.md`), and venue page limits through
`paper-latex/references/page-limit-compression.md`.

## Design section — the 5-move sequence

Answers "how should the reader *think* about this system" before "how it works
internally". Lead with the abstraction, not the implementation.

1. **Abstraction first** — open with the user-facing mental model / core abstraction
   (the intellectual contribution), not the implementation (the engineering
   contribution).
2. **Design justification (the "why")** — why this design over alternatives, often
   framed as a negative result ("the obvious approach fails because X"), so the
   chosen design feels inevitable rather than arbitrary.
3. **Component architecture** — decompose into named stages/modules the reader can
   trace (overview figure → one subsection per component). Component names become
   the vocabulary the Evaluation section reuses.
4. **Key design decision (the "knob")** — name the critical parameter / trade-off the
   user controls; its existence shows the system isn't one-size-fits-all.
5. **Robustness / edge cases** — what happens when assumptions fail (safety
   mechanisms, parameter sensitivity, distribution shift). Its absence is a common
   reviewer concern.

## Evaluation section — the move sequence

The evaluation is where the paper earns its claims. Student drafts often use only
move 2; adding 3–6 is what turns a lab notebook into a conference paper.

1. **Setup anchoring** — Datasets / Baselines / Metrics as one labeled paragraph
   each, compressed to what reproducibility needs (not a tech report).
2. **Head-to-head comparison** — against **named** baselines (never "prior work" or
   "state-of-the-art"), using the metrics defined in setup. This is the core
   evidence; if it doesn't support an introduction claim, the claim or the
   experiment must change.
3. **Deep dive / disaggregation** — break results down by dimension (difficulty,
   subgroup, condition, region) to show *who* benefits and *when*. Honest
   disaggregation strengthens the paper — reviewers trust authors who admit their
   system doesn't uniformly excel.
4. **Takeaway synthesis** — after each experiment cluster, an explicit "Takeaway"
   that states the *implication* (not just the result) and ties back to a
   contribution. Absent from student drafts, present in accepted papers — this is
   where the author controls the reader's interpretation.
5. **Ablation / sensitivity** — isolate which components and parameters actually
   matter.
6. **Limitations / cost** — honest boundaries and overhead, pre-empting the attacks
   a reviewer (or the adversarial review lens) would otherwise make.

## Use

Decide IMRAD (`section-moves.md`) vs Design/Evaluation (this file) by venue before
drafting. Adapted from the section-rhetorical-moves in `SNL-UCSB/paper-writing-skill`
(MIT); distilled into moves, not copied wording.
