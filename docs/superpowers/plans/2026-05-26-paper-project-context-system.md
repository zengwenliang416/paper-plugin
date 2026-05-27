# Paper Project Context System Plan

> **For agentic workers:** This is an implementation plan, not an implemented
> feature record. Work through the checkbox tasks in order. Do not create a new
> public skill unless the repository owner explicitly approves that boundary
> change.

Date: 2026-05-26
Status: Implemented in repository
Scope: Project-local context, versioning, evidence, and quality gates for paper
and thesis projects handled by Paper Plugin.

## Goal

Add a durable project context system for academic paper and thesis work so every
later writing, citation, figure, data, DOCX, defense, or reviewer-response task
can answer four questions before changing outputs:

- which project and paper version is active
- what the current source of truth is
- which claims, figures, references, data, and decisions support the current
  manuscript
- what must be updated, validated, frozen, deprecated, or rolled forward next

The system must not depend on hidden conversation memory. It must persist the
minimum useful context inside the paper project, load it progressively, validate
it before risky actions, and keep old projects compatible with the current
`thesis.yaml + content/ + assets/ + output/ + .thesis.json` workflow.

## Architectural Decision

Do not introduce a new public `paper-project-context` skill in the first
implementation.

Use the existing skill boundaries:

- `paper-workflow-router`: routing, lane sequencing, out-of-scope detection, and
  context checkpoint awareness.
- `paper-manuscript-writing`: owner of thesis/project context intake, source of
  truth, editable source, draft state, evidence gaps, claim ledgers, and context
  scripts.
- Other `paper-*` skills: consumers and contributors of lane-specific ledgers
  only. They must not rewrite project identity, selected source of truth, title,
  or global version state.

If a public context skill is later approved, it must be narrow and non-writing:
only create, audit, or update reusable academic project-context artifacts across
lanes. It must not draft prose, repair DOCX, verify citations, create figures,
write data statements, prepare slides, or draft reviewer responses.

## Current Repo Baseline

Existing project model:

```text
<thesis-project>/
  thesis.yaml
  content/
  assets/
  format/
  output/
  .thesis.json
```

Existing scripts:

- `skills/paper-manuscript-writing/scripts/import.ts` imports DOC/DOCX into the
  current project structure and creates `thesis.yaml`, `content/`, `assets/`,
  `output/`, and `.thesis.json`.
- `skills/paper-manuscript-writing/scripts/export.ts` exports from
  `thesis.yaml + content/` into DOCX and delegates `--version` tagging to
  `version.ts`.
- `skills/paper-manuscript-writing/scripts/version.ts` owns `.thesis.json`
  version entries and optional `thesis/<tag>` git tags.

Existing reference contracts already provide partial context pieces:

- manuscript intake and claim ledger rules
- reader `paper.md` and `source_map.json` anchor model
- visual evidence manifest
- reference verification ledger
- data availability provenance checks
- DOCX layout and repair scan contracts
- defense deck handoff contracts

The missing part is a project-level contract that connects those pieces and
makes them reloadable, versioned, and enforceable.

## Target Project Layout

Add a project-local context layer:

```text
<paper-project>/
  thesis.yaml
  content/
  assets/
  format/
  output/
  .thesis.json
  .paper-context/
    context.yaml
    manifest.json
    versions.yaml
    CURRENT.md
    decisions.md
    registry/
      sources.json
      artifacts.json
      claims.tsv
      issues.tsv
      people.yaml
    ledgers/
      evidence.tsv
      figures.tsv
      citations.tsv
      docx.tsv
      reviewer-comments.jsonl
      data-availability.yaml
    indexes/
      by-path.json
      by-hash.json
      by-anchor.json
    logs/
      events.jsonl
    runs/
      RUN-<timestamp>.md
    checkpoints/
      <version-id>.md
    diffs/
      RUN-<timestamp>.diff.md
    snapshots/
      <timestamp>-<label>.json
    cache/
      extracted-text/
      thumbnails/
      ooxml-scan/
    private.json
```

Rules:

- `.paper-context/` is an overlay, not the source manuscript.
- Do not copy large raw PDF/DOCX/image/data files into `.paper-context/`.
- Do not duplicate `paper.md` or `source_map.json` as authoritative text.
- Store relative paths, hashes, sizes, mtimes, and short excerpts only.
- `private.json` may contain local absolute paths or relink hints, but it must
  be ignored by default and never required for portable project state.

## Context Schema

### `context.yaml`

Human-readable, low-frequency project configuration:

```yaml
schema_version: 1
project_id: paperctx_20260526_xxxx
project_root: "."
path_base: project_root
title: ""
language: "zh-CN"
primary_workflow: thesis
context_state: UNINITIALIZED
canonical:
  thesis_yaml: "../thesis.yaml"
  thesis_state: "../.thesis.json"
  reader_paper_md: "../paper.md"
  reader_source_map: "../source_map.json"
privacy:
  store_absolute_paths: false
  redact_user_home: true
  allow_external_paths: manifest_only
```

### `manifest.json`

Machine-readable current snapshot entrypoint:

```json
{
  "schema_version": 1,
  "generated_at": "2026-05-26T00:00:00+08:00",
  "project_id": "paperctx_20260526_xxxx",
  "context_state": "MATERIALS_INVENTORIED",
  "current_version": "v0.1-intake",
  "active_version": "v0.1-intake",
  "objects": {
    "sources": "registry/sources.json",
    "artifacts": "registry/artifacts.json",
    "claims": "registry/claims.tsv",
    "versions": "versions.yaml"
  },
  "counts": {
    "sources": 12,
    "claims": 38,
    "issues": 7
  },
  "state_hash": "sha256:..."
}
```

### `sources.json`

Register original materials without copying them:

```json
[
  {
    "source_id": "SRC001",
    "kind": "docx",
    "role": "authority",
    "path": "../materials/task-book.docx",
    "absolute_path_redacted": true,
    "sha256": "sha256:...",
    "size_bytes": 123456,
    "mtime_ns": 1770000000000000000,
    "content_status": "indexed",
    "notes": ""
  }
]
```

### Ledger Formats

Use different formats by update pattern:

- YAML: low-frequency human-edited config such as `context.yaml`,
  `people.yaml`, and `data-availability.yaml`.
- JSON: object registries and indexes such as `manifest.json`,
  `sources.json`, `artifacts.json`, and `by-*.json`.
- TSV: claim, figure, citation, evidence, and issue ledgers because they are
  easy to diff and inspect as tables.
- JSONL: append-only events and reviewer comments because history grows and
  concurrent appends are safer than rewriting one large file.

Recommended `claims.tsv` header:

```tsv
claim_id	section	claim_text	claim_type	support_status	evidence_ids	source_refs	risk
```

Recommended `figures.tsv` header:

```tsv
figure_id	title	chapter	source_type	source_path	ai_generated	placeholder	evidence_status	body_reference	action
```

Recommended `citations.tsv` header:

```tsv
old_no	new_no	title	source_type	verification_source	verification_status	citation_locations	action
```

## Version Management

Keep `.thesis.json` as the existing machine-readable export/version index.
Do not put long session narrative into `.thesis.json`.

Add `.paper-context/versions.yaml` for semantic project version state:

```yaml
schema_version: 1
current_version: v0.3-draft-ch2
active_version: v0.3-draft-ch2
next_version: v0.4-evidence-reconcile
dirty: false
versions:
  - id: v0.1-intake
    type: context
    status: superseded
    role: material inventory and source hierarchy
    created_at: "2026-05-26T10:00:00+08:00"
    updated_at: "2026-05-26T10:30:00+08:00"
    source_hash: "sha256:..."
    checkpoint: "checkpoints/v0.1-intake.md"
    thesis_state_tag: ""
    changed_files: []
    ledger_refs: []
  - id: v0.2-outline
    type: structure
    status: frozen
    role: approved chapter structure baseline
    checkpoint: "checkpoints/v0.2-outline.md"
  - id: v0.3-draft-ch2
    type: working
    status: active
    role: current chapter-2 drafting baseline
    checkpoint: "checkpoints/v0.3-draft-ch2.md"
  - id: v0.4-evidence-reconcile
    type: candidate
    status: planned
    role: next evidence reconciliation pass
```

### Version Pointers

- `current_version`: latest project context state and default continuation
  target.
- `active_version`: baseline currently used for the task. Usually equals
  `current_version`, but may point to an older checkpoint during rollback or
  branch work.
- `next_version`: planned next version, not yet promoted.

### Version Status Values

- `planned`: known next version, not yet started.
- `active`: currently enabled for work.
- `dirty`: files changed since the active checkpoint and need snapshot or
  explicit discard.
- `frozen`: locked baseline; only derive a new version from it.
- `superseded`: replaced by a later version but kept for traceability.
- `archived`: final delivered or submission state.
- `deprecated`: known wrong-topic, wrong-scope, or discarded version.

### Update vs New Version Rules

Update the current version when the work is small and does not change project
identity or delivery stage:

- same-section polish or rewrite
- small citation, figure, or claim ledger corrections
- small DOCX repair report updates
- refreshing hashes after non-semantic file changes

Create a new version when the work changes stage, scope, or recovery needs:

- title, research object, or task scope changes
- source of truth changes
- chapter structure is reorganized
- initial draft moves to evidence reconciliation
- references, visuals, data, or DOCX become their own validation pass
- teacher comments start a new revision round
- official export, defense, submission, or archive milestone is created
- rollback or alternative branch work must remain recoverable

### Version Transitions

```text
planned -> active
active -> dirty
dirty -> active       # snapshot/checkpoint completed
active -> frozen
frozen -> superseded  # later approved baseline exists
active/frozen -> archived
active/planned -> deprecated
```

All transition events must append to `logs/events.jsonl`. Major transitions
must update `CURRENT.md` and create or refresh a checkpoint.

## Lifecycle State Machine

Project context state is separate from semantic version status:

```text
UNINITIALIZED
 -> INITIALIZED
 -> MATERIALS_INVENTORIED
 -> SCOPE_LOCKED
 -> STRUCTURE_PLANNED
 -> SECTION_DRAFTING
 -> EVIDENCE_RECONCILING
 -> REFERENCES_READY
 -> VISUALS_READY
 -> DATA_READY
 -> EXPORT_CANDIDATE
 -> DOCX_VERIFIED
 -> DEFENSE_READY / SUBMISSION_READY
 -> RESPONSE_REVISION
 -> FINAL_DELIVERED
 -> ARCHIVED
```

Blocking transition rules:

- Do not enter `SCOPE_LOCKED` while title, task book, teacher comments, and
  selected editable source conflict.
- Do not enter `SECTION_DRAFTING` without an outline and required evidence map.
- Do not enter `EXPORT_CANDIDATE` if high-risk claims are missing ledgers.
- Do not enter `DOCX_VERIFIED` from XML-only checks; record rendered preview,
  PDF conversion, or manual visible-page evidence.
- Do not enter `DEFENSE_READY` while visuals are placeholders for core evidence.
- Do not enter `ARCHIVED` without final outputs, checksums, validation report,
  version checkpoint, and known limitations.

## Evidence Graph Model

The context system should act like a lightweight evidence graph without forcing
one monolithic graph database.

Core entities:

- `Claim`
- `SourceDocument`
- `SourceBlock`
- `Experiment`
- `Dataset`
- `CodeArtifact`
- `Figure`
- `Table`
- `Panel`
- `Reference`
- `Decision`
- `VerificationEvent`
- `Conflict`

Core relationships:

```text
Claim --supported_by--> SourceBlock | Experiment | Figure | Reference | CodeArtifact
Claim --contradicted_by--> SourceBlock | Experiment | VerificationEvent
Claim --requires--> Experiment | Dataset | Reference | Figure
Experiment --uses_dataset--> Dataset
Experiment --executed_by--> CodeArtifact
Experiment --produces--> Figure | Table | ResultMetric | Log
Figure/Panel --derived_from--> Dataset | CodeArtifact | SourceBlock
Figure/Panel --illustrates--> Claim
Figure/Panel --evidence_for--> Claim
Reference --metadata_verified_by--> VerificationEvent
Reference --supports_claim--> Claim
Reference --cited_at--> SourceBlock
Decision --modifies--> Claim | Figure | Reference | SourceBlock
Decision --based_on--> Claim | SourceBlock | VerificationEvent | previous Decision
Decision --supersedes--> Decision
VerificationEvent --validates--> Entity | Relation
Conflict --blocks--> Decision | Claim
```

Verification status values:

- `candidate`
- `metadata_verified`
- `source_located`
- `content_verified`
- `reproduction_verified`
- `figure_source_verified`
- `partial`
- `missing`
- `contradictory`
- `unsupported`
- `out_of_scope`
- `superseded`

## Progressive Context Loading

Do not load the whole paper project by default.

### L0 Startup Layer

Load only:

- user request
- nearest project instructions
- `paper-workflow-router/SKILL.md`
- `routing-matrix.md` when routing is ambiguous or mixed
- `.paper-context/manifest.json` and `CURRENT.md` when present

Router output should include:

```text
Routing decision:
- primary skill:
- supporting skills:
- lane order:
- context_path:
- current_version:
- active_version:
- context_state:
- context_budget:
- L1_entrypoints:
- L2_evidence_packet:
- L3_triggers:
- stale_checks:
- out of scope:
- first action:
```

### L1 Skill Entrypoint Layer

Load only the selected primary skill and one or two relevant references:

- writing/project context: `thesis-project-intake.md`,
  `thesis-claim-audit.md`
- citations: `thesis-reference-integrity.md`,
  `thesis-reference-audit.md`
- figures: `visual-evidence-manifest.md`,
  thesis visual evidence references
- DOCX: `paper-docx-repair/SKILL.md`, layout scan contracts
- reader: grounding/output spec references
- data: policy and FAIR references
- defense: thesis defense deck and demo handoff references
- response: intake and action mapping references

### L2 Evidence Packet Layer

Load only the current lane's local evidence packet:

- target chapter and adjacent referenced sections
- relevant claim rows
- relevant citation rows
- visual manifest rows
- data/source rows
- DOCX scan report
- related decisions and current issues

### L3 Original Evidence Layer

Open only when required by conflict, proof, or exact repair:

- PDF/OCR page
- DOCX XML
- original screenshot/photo/CAD/simulation file
- source code function
- database schema
- command log
- Crossref/CNKI/publisher evidence
- historical run or checkpoint

## Session Continuity

Every modifying session must update:

- `.paper-context/CURRENT.md`
- `.paper-context/runs/RUN-<timestamp>.md`
- `.paper-context/decisions.md` when a durable decision was made
- `.paper-context/versions.yaml` when version status changes
- `.paper-context/checkpoints/<version>.md` when a checkpoint is created

Recommended `CURRENT.md`:

```md
# Current Paper Context

- Current version:
- Active version:
- Next version:
- Context state:
- Editable source:
- Latest output:
- Completed this run:
- Not completed:
- Next first action:
- Risks/blockers:
- Recent run:
- Recent checkpoint:
```

Recommended run record:

```md
# RUN-<timestamp>

- User goal:
- Loaded context:
- Modified files:
- Key changes:
- Evidence used:
- Validation run:
- Outputs:
- Related decisions:
- Related checkpoint:
- Remaining TODO:
```

Decision records are append-only in `decisions.md`:

```md
## DEC-0007 <title>

- Date:
- Context:
- Decision:
- Reason:
- Impact:
- Alternatives:
- Related run:
- Related version:
- Rollback:
```

## Quality Gates

Add project-level validation with structured JSON output.

### Gates

| Gate | Blocks | P0 blocking conditions |
| --- | --- | --- |
| `pre-write` | final-style drafting or expansion | source of truth unknown, chapter state unknown, high-risk claims have no ledger, code/data/image sources are not inventoried |
| `pre-export` | final DOCX/PDF export | `[TODO]`, missing/contradictory claims, dangling citations, missing visual media, unsupported experiment data, privacy leak |
| `pre-archive` | final tag or delivery package | export not verified, `.thesis.json` points to missing output, stale context, private or temporary files in delivery |

### Finding Format

```json
{
  "gate": "pre-export",
  "status": "blocked",
  "summary": { "p0": 2, "p1": 3, "p2": 1 },
  "findings": [
    {
      "severity": "P0",
      "code": "CLAIM_EVIDENCE_MISSING",
      "blocking": true,
      "target": "content/ch03.md#实验结果表明",
      "message": "High-risk experimental conclusion has no traceable data, script, or log.",
      "required_action": "Add evidence to claim ledger, or delete/soften the claim."
    }
  ]
}
```

### Validation Areas

- claim evidence
- citation/bibliography integrity
- figure/media provenance
- data availability and source data
- DOCX package and rendered layout evidence
- context freshness
- privacy and local-path leakage
- version pointer consistency

## CLI Plan

Add one script first:

```text
skills/paper-manuscript-writing/scripts/context.ts
```

Subcommands:

```bash
npx tsx skills/paper-manuscript-writing/scripts/context.ts init <project-dir>
npx tsx skills/paper-manuscript-writing/scripts/context.ts load <project-dir> --format json
npx tsx skills/paper-manuscript-writing/scripts/context.ts update <project-dir>
npx tsx skills/paper-manuscript-writing/scripts/context.ts validate <project-dir> --gate pre-write
npx tsx skills/paper-manuscript-writing/scripts/context.ts snapshot <project-dir> --label before-export
```

Exit codes:

- `0`: success
- `1`: business validation failure
- `2`: CLI usage error
- `3`: read/write or parse failure
- `4`: external dependency failure

Root-level validation should only test plugin contracts, not real user projects:

```text
scripts/validate-context.mjs
```

`npm run validate` should eventually verify:

- context CLI exists and `--help` works
- fixture projects validate deterministically
- context schema and error codes are stable
- router tests cover context routing cases
- no real paper materials are required by tests

## Integration Points

### `paper-workflow-router`

Update routing rules to:

- detect project context tasks
- report context path and version pointers
- treat source-of-truth intake as the first lane before writing or formatting
- include context validation in mixed-lane ordering

### `paper-manuscript-writing`

Update `SKILL.md` description to include source-of-truth intake and project
context ownership.

Update references to require persisted context for project-level writing work:

- intake writes material registry
- claim audit writes claim/evidence ledgers
- large rewrites update run, decision, and version records

### `import.ts`

After creating `thesis.yaml` and `.thesis.json`, call or mirror context `init`
and `snapshot --label import`.

### `export.ts`

Before final export, run `context validate --gate pre-export` unless explicitly
draft-only. After successful export, run `context snapshot --label export`.

### `version.ts`

Keep `.thesis.json` as the single source for export tags and output copies.
After `tag`, create or update:

- `.paper-context/versions.yaml`
- `.paper-context/checkpoints/<tag>.md`
- `.paper-context/snapshots/<timestamp>-version-<tag>.json`

## Migration Strategy

Use non-destructive adoption.

### v0 Detect

Read only. Identify:

- `thesis.yaml`
- `content/`
- `assets/`
- `format/`
- `output/`
- `.thesis.json`
- existing DOCX/PDF
- school templates
- task books
- opening reports
- teacher comments
- source code/data/screenshots

Output a migration report:

- directly adoptable
- missing metadata
- DOCX repair only
- needs authority-source selection

### v1 Adopt

Create `.paper-context/` and registry files by referencing existing files.
Do not move, rename, or rewrite old project files.

### v2 Validate

Run project gates and compare:

- source file hashes
- chapter inventory
- references
- visual/media state
- latest output DOCX
- `.thesis.json` version pointers

### v3 Normalize

Only with explicit approval:

- create missing context directories
- derive template metadata
- generate normalized reports
- create new version checkpoint

Rollback rule: deleting `.paper-context/` must return the project to the old
workflow.

## Privacy And Portability

Default safe behavior:

- store project-relative paths
- store hashes, sizes, and mtimes
- redact user home and mounted volume details in reports
- store absolute paths only in ignored `private.json`
- never treat caches as the only evidence source
- detect stale source hashes before using cached context
- stop for authority-source selection when multiple thesis/DOCX candidates
  exist

Default ignore recommendations for paper projects:

```gitignore
.paper-context/private.json
.paper-context/cache/
output/
_archive/
*.bak*
*.log
~$*
.tmp-*
.full-import.md
reader.html
translation_notes.md
```

Do not commit user PDF/DOCX, raw screenshots, student IDs, advisor comments,
school templates, or reviewer material unless the project is explicitly a
private delivery repository and the owner approves it.

## Implementation Tasks

## Task 1: Add context contract references

**Files:**

- Create: `skills/paper-workflow-router/references/project-context-contract.md`
- Create: `skills/paper-workflow-router/references/lifecycle-state-machine.md`
- Modify: `skills/paper-workflow-router/SKILL.md`
- Modify: `skills/paper-workflow-router/references/routing-matrix.md`
- Modify: `skills/paper-workflow-router/tests/routing-cases.json`

- [x] Document router context fields and progressive loading.
- [x] Add lifecycle state machine summary.
- [x] Route "project context", "continue previous thesis", and "understand this
      paper project first" to manuscript intake with context checkpointing.
- [x] Keep router read-only for project facts.
- [x] Add router test cases for context-only and mixed thesis/project delivery.

## Task 2: Add manuscript context ownership references

**Files:**

- Modify: `skills/paper-manuscript-writing/SKILL.md`
- Modify: `skills/paper-manuscript-writing/references/thesis-project-intake.md`
- Modify: `skills/paper-manuscript-writing/references/thesis-claim-audit.md`
- Create: `skills/paper-manuscript-writing/references/project-context-system.md`
- Create: `skills/paper-manuscript-writing/references/project-versioning.md`

- [x] Declare `paper-manuscript-writing` as context owner for thesis/project
      writing work.
- [x] Require persisted material registry, source hierarchy, and claim ledger
      before large drafting.
- [x] Document `versions.yaml`, `CURRENT.md`, run records, decisions, and
      checkpoints.
- [x] Clarify that `.thesis.json` remains export/version index only.

## Task 3: Implement context CLI MVP

**Files:**

- Create: `skills/paper-manuscript-writing/scripts/context.ts`
- Create: `scripts/validate-context.mjs`
- Modify: `package.json`

- [x] Implement `init`.
- [x] Implement `load --format json|yaml|md`.
- [x] Implement `update`.
- [x] Implement `validate --gate pre-write|pre-export|pre-archive`.
- [x] Implement `snapshot --label <label>`.
- [x] Add stable exit codes.
- [x] Add plugin-level static validation.
- [x] Keep real project validation out of root `npm run validate` except through
      synthetic fixtures.

## Task 4: Add synthetic context fixtures and tests

**Files:**

- Create: `skills/paper-manuscript-writing/tests/context-fixtures/`
- Create: `skills/paper-manuscript-writing/tests/context-contract.md`
- Modify: `scripts/validate-context.mjs`

- [x] Minimal valid project fixture.
- [x] Missing chapter fixture.
- [x] Stale output fixture.
- [x] Missing claim evidence fixture.
- [x] Dangling citation fixture.
- [x] AI-image-as-evidence fixture.
- [x] Privacy leak fixture.
- [x] Validate stable error shape and error codes.

## Task 5: Integrate import/export/version

**Files:**

- Modify: `skills/paper-manuscript-writing/scripts/import.ts`
- Modify: `skills/paper-manuscript-writing/scripts/export.ts`
- Modify: `skills/paper-manuscript-writing/scripts/version.ts`

- [x] After import, create `.paper-context/` and import snapshot.
- [x] Before final export, run `pre-export` gate.
- [x] After export, create export snapshot.
- [x] After version tag, update `versions.yaml` and checkpoint.
- [x] Preserve old workflow when `.paper-context/` is absent or context mode is
      disabled.

## Task 6: Add project-level gate semantics

**Files:**

- Modify: `skills/paper-manuscript-writing/scripts/context.ts`
- Create: `skills/paper-manuscript-writing/references/context-quality-gates.md`

- [x] Implement P0/P1/P2 findings.
- [x] Implement stale checks from file hashes and mtimes.
- [x] Implement basic claim high-risk phrase scan.
- [x] Implement basic citation/body-reference checks.
- [x] Implement basic visual manifest checks.
- [x] Implement basic privacy/path scan.
- [x] Require explicit `--force --reason <text>` for P0 override.

## Task 7: Document migration and rollback

**Files:**

- Create: `docs/context/project-context-layout.md`
- Create: `docs/context/project-context-migration.md`
- Create: `docs/context/project-context-validation.md`
- Modify: `docs/migration-notes.md`

- [x] Document v0 detect, v1 adopt, v2 validate, v3 normalize.
- [x] Document rollback by deleting `.paper-context/`.
- [x] Document old `thesis.yaml` project compatibility.
- [x] Document privacy-safe commit behavior.

## Task 8: Final validation and changelog

**Files:**

- Modify: `CHANGELOG.md`

- [x] Run `npm run validate`.
- [x] Run context fixture validation.
- [x] Confirm no real user paper artifacts are committed.
- [x] Update changelog with context-system contracts, scripts, and validation.

## Acceptance Criteria

The feature is ready when:

- A legacy `thesis.yaml + content/` project can adopt `.paper-context/` without
  changing existing manuscript files.
- `context load` can produce the current project context, version pointers, and
  next action without reading every source file.
- `versions.yaml` can distinguish active, current, next, frozen, superseded,
  archived, deprecated, and dirty states.
- `pre-write`, `pre-export`, and `pre-archive` gates return stable JSON and block
  P0 conditions.
- `version.ts` remains the owner of `.thesis.json` export tags.
- Router decisions expose context path, version pointers, and validation needs.
- Other skills can consume the relevant ledger without changing global project
  identity.
- Deleting `.paper-context/` restores the old project workflow.
- `npm run validate` passes with only synthetic fixture data.

## Non-Goals

- Do not build a graph database.
- Do not create a public context skill without approval.
- Do not make `.paper-context/` the canonical manuscript body.
- Do not duplicate full DOCX/PDF/Paper Reader content in context files.
- Do not require Pandoc, LibreOffice, or browser rendering for context unit
  tests.
- Do not store credentials, personal tokens, or local absolute paths in
  committed context files.
