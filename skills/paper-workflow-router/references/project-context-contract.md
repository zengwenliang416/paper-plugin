# Project Context Contract

Use this contract when a request starts from a paper/thesis project folder,
mentions continuing previous work, asks to understand current materials, or
mixes writing with references, figures, data, DOCX, defense, reviewer response,
or software evidence.

## Router responsibility

`paper-workflow-router` is read-only for project facts. It decides lane order
and exposes context status, but it does not write thesis facts, claims, source
hierarchy, or version state.

The context owner is `paper-manuscript-writing`. Other paper skills may add
lane-specific ledgers, but they must not change project identity, title, source
of truth, editable source, or global version pointers.

## Required routing fields

For non-trivial project tasks, include these fields in the routing decision:

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

Use `unknown` for context fields when `.paper-context/` is absent. Do not invent
version IDs.

## Progressive loading

### L0 startup

Load only the user request, nearest project instructions, this router skill, the
routing matrix, and `.paper-context/manifest.json` plus `CURRENT.md` when they
exist.

### L1 skill entrypoint

Load one primary skill and at most one or two references needed by the selected
lane.

### L2 evidence packet

Load local rows and files relevant to the lane:

- target chapter and adjacent referenced sections
- relevant claim rows
- citation map rows
- visual manifest rows
- data/source rows
- DOCX scan report and page-PNG render ledger row
- related decisions and current issues

### L3 original evidence

Open originals only when needed for proof, conflict resolution, or exact repair:
PDF/OCR pages, DOCX XML, screenshots, CAD, source code, database schema, logs,
Crossref/CNKI/publisher evidence, and historical run/checkpoint files.

## Lane order with context

Default mixed-lane order:

1. `paper-workflow-router`: classify lanes and out-of-scope parts.
2. `paper-manuscript-writing`: create or update project context, source
   hierarchy, material registry, evidence gaps, version pointers, and claim
   ledger.
3. `paper-literature`: verify references and citation support.
4. `paper-figure`: verify visuals and media provenance.
5. `paper-data`: verify source data and data availability when applicable.
6. `paper-docx-repair`: export/repair/validate final DOCX after content and
   evidence changes, then render page PNGs and verify every page before final
   delivery.
7. `paper-paper2ppt`: consume locked thesis content and visual/data ledgers for
   defense handoff.
8. `paper-response`: branch into reviewer-response actions and route back to
   writing, evidence, references, figures, or data as needed.

## Ambiguity rules

- "先理解项目", "梳理上下文", "继续上次论文", "根据当前论文项目写" means
  manuscript intake with context checkpointing.
- "论文和源码一起交付" means router primary, manuscript/docx/ppt supporting, and
  project packaging out of paper-plugin scope by default.
- "终稿", "归档", "最终交付" requires DOCX page-PNG render QA and `pre-archive`
  validation before claiming completion.
- "导出 Word/DOCX" requires `pre-export` validation when `.paper-context/`
  exists.

## Context safety

- Do not load every skill or every source file just because context exists.
- Do not treat cached summaries as authoritative facts.
- Do not use stale context when source hashes or mtimes changed.
- Do not store or display local absolute paths unless needed for local repair.
