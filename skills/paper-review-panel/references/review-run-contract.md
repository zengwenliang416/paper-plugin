# Review Run Contract

`scripts/review.ts` runs the configured panel against a target text and prints a **GateDecision**. It reads `.paper-context/review-panel.yaml` and each endpoint's key from the environment (`auth_env`). It performs the review only; revising the manuscript and looping rounds are the caller's job (`paper-manuscript-writing`).

## Invocation

```bash
# review a chapter file
npx tsx skills/paper-review-panel/scripts/review.ts <project-dir> --file content/ch03.md --ledger

# review inline text
npx tsx skills/paper-review-panel/scripts/review.ts <project-dir> --text "…摘要…"

# see who would be called, spend nothing
npx tsx skills/paper-review-panel/scripts/review.ts <project-dir> --file content/ch03.md --dry-run

# aggregate a verdicts file only — no API calls (testing / human-in-the-loop)
npx tsx skills/paper-review-panel/scripts/review.ts <project-dir> --aggregate verdicts.json
```

## Per-reviewer call

For each `panel[]` row: load the lens prompt from `references/review-lenses/<lens>.md` (`{{TARGET}}` ← text), POST to `<base_url>/v1/messages` with `Authorization: Bearer <env[auth_env]>`, `anthropic-version: 2023-06-01`, body `{ model, max_tokens, messages:[{role:user,content:prompt}] }`. Calls run concurrently with a 90s timeout each.

- Response parsing extracts `text` blocks; if empty (truncated `thinking-first` endpoint), it falls back to `thinking` blocks.
- `decision` is parsed from the last of `通过 / 需修改 / 打回` (or `pass / revise / block`); none found → `revise` (conservative).
- A failed/timed-out/keyless reviewer becomes `decision: "error"` with an `error` note and does not vote.

## Decision model (deterministic)

`aggregate(verdicts)` — the testable core:

1. Drop `error` verdicts (they do not vote); count them in `tally.errored`.
2. If no effective verdicts remain → `result: "error"`.
3. If any **veto** reviewer returned `block` → `result: "block"`.
4. Else by weight: `block` if `blockW > passW`; `revise` if any non-pass weight remains; else `pass`.

## GateDecision shape

```json
{
  "gate": "ad-hoc",
  "result": "pass | revise | block | error | disabled",
  "veto_triggered": false,
  "tally": { "passW": 3, "reviseW": 0, "blockW": 1, "errored": 0 },
  "reviewers": [
    { "endpoint": "minimax", "model": "MiniMax-M3", "lens": "rigor",
      "weight": 2, "veto": false, "decision": "pass", "excerpt": "…" }
  ]
}
```

Exit code: `1` when `result` is `block`, else `0`. `--ledger` appends a compact row to `.paper-context/ledgers/review.jsonl` (no secrets, no raw text — only decisions).

## Boundaries

- Secrets are read from the environment at call time; never written to files, ledgers, or logs.
- The engine does not revise text or loop rounds; the caller decides whether to revise (via `paper-manuscript-writing`) and re-run.
- `verdict.max_rounds` in the config is advisory for that caller loop; this script runs one round.
