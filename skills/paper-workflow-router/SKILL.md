---
name: paper-workflow-router
description: Use when an academic paper, thesis, DOCX, citation, figure, data, reviewer response, defense PPT, project context, or mixed thesis/project task needs lane selection, context checkpointing, or paper-vs-software scope separation before execution.
---

# Paper Workflow Router

Use this skill as the intake and routing layer for Paper Plugin tasks. It does not replace the specialized paper skills; it selects them, exposes context state when available, and defines the lane order.

## Routing workflow

1. Inspect the user request and local materials, if available.
2. Decide whether the task is single-lane, multi-lane, or out of paper-plugin scope.
3. For clear single-lane tasks, state the selected skill briefly and continue with that skill's workflow.
4. For mixed tasks, split the work into lanes and sequence them so evidence and source selection happen before writing or formatting.
5. For out-of-scope software or environment tasks, route out unless the work directly supports thesis evidence or final academic delivery.
6. For project-context tasks, read `.paper-context/manifest.json` and `CURRENT.md` when present, but keep project fact writes inside `paper-manuscript-writing`.

## Output contract

For non-trivial or mixed requests, produce a compact routing decision:

```text
Routing decision:
- primary skill: <skill-name>
- supporting skills: <skill-name list or none>
- lane order: <ordered lane list>
- context_path: <.paper-context path or unknown>
- current_version: <version id or unknown>
- active_version: <version id or unknown>
- context_state: <state or unknown>
- context_budget: <minimal / lane / proof>
- L1_entrypoints: <selected SKILL.md/reference files>
- L2_evidence_packet: <claim/citation/visual/data/docx packet>
- L3_triggers: <when to open originals/history>
- stale_checks: <hash/mtime/context checks to run>
- out of scope: <software/environment tasks, if any>
- first action: <next concrete inspection or edit>
```

Do not load every Paper Plugin skill by default. Load only the selected skill entrypoint and the specific references needed for the current lane.

## Open as needed

- `references/routing-matrix.md` for trigger signals, skill mapping, lane order, and out-of-scope rules.
- `references/project-context-contract.md` for context-aware routing, progressive loading, and context fields.
- `references/lifecycle-state-machine.md` for lifecycle states and blocked transitions.
