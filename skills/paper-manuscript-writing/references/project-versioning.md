# Project Versioning

Use this with `.paper-context/versions.yaml`. It defines which version is
currently active, which version is next, which versions are frozen, and which
old versions are retained only for traceability.

## Separation of concerns

- `.thesis.json` remains the machine-readable export/version index maintained by
  `scripts/version.ts`.
- `.paper-context/versions.yaml` stores semantic project version state for
  collaboration, continuation, validation, and rollback.
- `checkpoints/<version>.md` stores human-readable context for a recoverable
  version.

Do not put long session narrative into `.thesis.json`.

## Required pointers

```yaml
current_version: v0.3-draft-ch2
active_version: v0.3-draft-ch2
next_version: v0.4-evidence-reconcile
dirty: false
```

- `current_version`: latest project context state and default continuation
  target.
- `active_version`: baseline currently used for the task. Usually equals
  `current_version`, but may point to an older checkpoint during rollback or
  branch work.
- `next_version`: planned next version, not yet promoted.
- `dirty`: current files changed since the active checkpoint or latest context
  snapshot.

## Status values

- `planned`: known next version, not yet started.
- `active`: currently enabled for work.
- `dirty`: files changed since active checkpoint.
- `frozen`: locked baseline; derive a new version instead of editing directly.
- `superseded`: replaced by later version but retained for traceability.
- `archived`: final delivered or submitted state.
- `deprecated`: wrong-topic, wrong-scope, or discarded version.

## Update current version

Update the current version for small same-stage changes:

- same-section polish or rewrite
- small citation, figure, or claim-ledger correction
- small DOCX repair-report update
- refreshing hashes after non-semantic file changes

## Create a new version

Create a new semantic version when stage, source, scope, or recovery needs
change:

- title, research object, or task scope changes
- source of truth changes
- chapter structure is reorganized
- initial draft moves to evidence reconciliation
- references, visuals, data, or DOCX become their own validation pass
- teacher comments start a new revision round
- official export, defense, submission, or archive milestone is created
- rollback or alternative branch work must remain recoverable

## Transitions

```text
planned -> active
active -> dirty
dirty -> active
active -> frozen
frozen -> superseded
active/frozen -> archived
active/planned -> deprecated
```

All transition events should append to `.paper-context/logs/events.jsonl`.
