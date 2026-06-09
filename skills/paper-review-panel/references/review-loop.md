# Multi-Round Re-Review Loop

How to use the review engine across rounds — 评 → 改 → 再评. `review.ts` runs **one** round; this is the loop around it. Revision is performed by `paper-manuscript-writing` (human-in-the-loop). **This loop never auto-rewrites the manuscript.**

## Loop

1. Read `max_rounds` from `review-panel.yaml` (`verdict.max_rounds`, default 2). `round = 1`.
2. Run one round:
   ```bash
   npx tsx skills/paper-review-panel/scripts/review.ts <project-dir> --file <target> --gate round-{round} --ledger
   ```
3. Branch on `result`:
   - `pass` → **done**, accept the target.
   - `error` → **stop**; an endpoint failed (check keys / network / quota). Fix infra, do not loop.
   - `revise` or `block` → continue to step 4.
4. If `round >= max_rounds` → **stop and escalate** to a human with the accumulated findings (do not keep looping).
5. Otherwise hand the non-pass findings to `paper-manuscript-writing` to revise the target (a person may review the edit). Then `round += 1` and go to step 2.

## What crosses to the revision step

For each non-pass reviewer, pass its `lens` + `excerpt` (the findings) to revision. **Veto-block findings** (e.g. `citation` integrity) must be *resolved*, not merely softened — a `block` from a `veto` reviewer is non-negotiable.

## Structured remediation

Don't hand revision a bare finding — hand a **remediation directive** the revision step can act on and the next round can check for closure. For each non-pass finding, structure:

- `finding_id` — stable id, carried across rounds (so round N+1 can confirm closure, not re-litigate).
- `lens` + `locator` — which reviewer, and where (section / excerpt anchor).
- `problem` — what fails, in one line.
- `required_change` — the concrete edit the manuscript skill must make.
- `acceptance` — how the next round decides it is resolved (not merely "softened").
- `veto` — true for integrity/citation blocks: must be *resolved*, non-negotiable.

The loop automates **review → stop-control → remediation-directive generation → next-round acceptance check**. It does **not** automate the edit: the manuscript skill (human-in-the-loop) makes the change, exactly as in "Why not auto-rewrite" below. This keeps the borrowed "structured feedback + bounded retries + escalate" shape **without** crossing into auto-rewriting a manuscript — the bounded retries are `max_rounds`, and escalation hands a human the **open directives**, not just raw findings.

Record each directive's round and closure state in the review ledger alongside the `gate = round-N` entry, so the round history shows what was asked and whether it was met.

## Stop conditions (never loop forever)

The loop ends on exactly one of: `pass`, `round == max_rounds` (escalate), or `result == error` (fix infrastructure first).

## Ledger

Each round appends to `.paper-context/ledgers/review.jsonl` with `gate = round-N`, so the round history is traceable (decisions only — no secrets, no raw manuscript text). The revision itself is recorded by `paper-manuscript-writing` in its claim/evidence ledgers, not here.

## Why not auto-rewrite

Auto-rewriting an academic manuscript risks fabrication and silent error injection, and revision ownership belongs to `paper-manuscript-writing`. This loop automates **review and stop-control**; a person or the manuscript skill owns the **edit**.
