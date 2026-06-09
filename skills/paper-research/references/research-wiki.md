# Research Wiki (persistent research memory)

ARIS's "Research Wiki" — accumulate research findings so they're reusable across sessions — maps onto `.paper-context`'s persistent structures + `paper-research` outputs. **No new store**; this is the convention for persisting and retrieving research knowledge.

## Where it persists (existing `.paper-context`)

- `snapshots/` — point-in-time research state (review skeleton, gap list at a moment).
- `ledgers/` — claim/citation/evidence provenance (the verified facts).
- `checkpoints/` — version-tagged milestones.
- `logs/events.jsonl` — what happened, when.

## What to persist from paper-research

After each topic → review → gap pass, write the outputs so a later session reuses them instead of redoing the work:

- the focused research question(s) + scope (topic step);
- the clustered review skeleton (review step);
- the gap list with evidence (gap step) — what motivates the contribution.

Convention: **append a dated entry, never overwrite — accumulate**. Link each finding to the `source_id`s it rests on (see `paper-manuscript-writing/references/material-passport.md`).

## Retrieval

Before a new review on a related question, read prior snapshots/notes: reuse known themes and gaps instead of re-reviewing from scratch.

## Boundary

- **Per-project** persistence (`.paper-context`), not a cross-project global wiki — that would be a larger, separate system, out of scope here.
- Findings are drafts until their citations pass `paper-literature/verify-refs.ts`.
