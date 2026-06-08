---
name: paper-review-panel
description: Use when initializing or updating the paper-plugin review panel — turning multi-model multi-perspective manuscript review on or off, and configuring the endpoint pool, review lenses, panel matrix, and verdict rules stored in .paper-context/review-panel.yaml.
---

# Paper Review Panel

Use this skill to set up *multi-model, multi-perspective* review for a paper/thesis project. It owns one file — `.paper-context/review-panel.yaml` — that decides whether extra review is enabled and which `(model × lens)` reviewers form the panel. It does **not** run the review; it produces and validates the configuration that a later review step consumes.

## When to use

- The user wants to enable or disable multi-model multi-perspective review for a project.
- The user wants to add or change review endpoints (models), lenses (perspectives), the panel matrix, or verdict rules.
- A later review step needs the panel configuration before it can run.

## Configuration workflow

1. Ask the user whether to enable multi-model multi-perspective review.
2. If disabled, write `enabled: false` and stop — plugin behavior is unchanged.
3. If enabled, choose **default** (apply the built-in panel) or **manual** (collect endpoints → lenses → panel → verdict from the user).
4. Generate the file with the bundled script, then validate it:

```bash
npx tsx skills/paper-review-panel/scripts/init-review-panel.ts <project-dir> --default
npx tsx skills/paper-review-panel/scripts/validate-review-panel.ts <project-dir>
```

5. Tell the user which environment variables to export. Secrets never enter the file: each endpoint stores only an `auth_env` (an environment-variable name).

## Running a review

Once the panel is configured and keys are exported, run one review pass:

```bash
npx tsx skills/paper-review-panel/scripts/review.ts <project-dir> --file content/ch03.md --ledger
npx tsx skills/paper-review-panel/scripts/review.ts <project-dir> --file content/ch03.md --dry-run   # spend nothing
```

It calls each reviewer concurrently and prints a GateDecision (`pass` / `revise` / `block`). This is **one round** — deciding whether to revise (via `paper-manuscript-writing`) and re-run is the caller's job. See `references/review-run-contract.md`.

## Multi-round re-review

`review.ts` runs one round. For 评 → 改 → 再评, loop it: run a round → if `pass` stop; if `revise`/`block`, hand the findings to `paper-manuscript-writing` to revise (human may check), then re-run with `--gate round-2`. Stop at `pass`, at `verdict.max_rounds`, or on `error`. The loop **never auto-rewrites** the manuscript — see `references/review-loop.md`.

## Config contract

`.paper-context/review-panel.yaml` has four layers — `endpoints` / `lenses` / `panel` / `verdict`. See `references/review-panel-contract.md` for the full schema, field rules, validation codes, and security rules (plaintext keys are rejected).

## Security

- The config stores `auth_env` names only — never plaintext keys.
- Validation hard-fails if a key-like string (`sk-…`, `tp-…`, AWS keys, PEM blocks) appears in the file.
- Never print resolved secrets to logs or ledgers.

## Boundary

- This skill owns only `review-panel.yaml`. Project identity, source hierarchy, and version pointers stay owned by `paper-manuscript-writing`.
- It does not run reviews, aggregate verdicts, or change `paper-workflow-router` behavior.

## Open as needed

- `references/review-panel-contract.md` — config schema, validation codes, security rules.
- `references/default-panel.md` — the built-in default panel and required environment variables.
- `references/review-lenses/` — prompt templates per perspective (`rigor`, `citation`, `completeness`).
- `references/review-run-contract.md` — how a review run calls endpoints, parses responses, and aggregates verdicts.
- `references/review-loop.md` — orchestration for multi-round 评→改→再评 with stop conditions.
