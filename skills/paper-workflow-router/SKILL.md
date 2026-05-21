---
name: paper-workflow-router
description: Use when the user has an academic paper, thesis, DOCX, citation, figure, data, reviewer response, defense PPT, or mixed thesis/project delivery task and needs the correct paper-plugin workflow selected before execution.
---

# Paper Workflow Router

Use this skill as the intake and routing layer for Paper Plugin tasks. It does not replace the specialized paper skills; it selects them and defines the lane order.

## Routing workflow

1. Inspect the user request and local materials, if available.
2. Decide whether the task is single-lane, multi-lane, or out of paper-plugin scope.
3. For clear single-lane tasks, state the selected skill briefly and continue with that skill's workflow.
4. For mixed tasks, split the work into lanes and sequence them so evidence and source selection happen before writing or formatting.
5. For out-of-scope software or environment tasks, route out unless the work directly supports thesis evidence or final academic delivery.

## Output contract

For non-trivial or mixed requests, produce a compact routing decision:

```text
Routing decision:
- primary skill: <skill-name>
- supporting skills: <skill-name list or none>
- lane order: <ordered lane list>
- out of scope: <software/environment tasks, if any>
- first action: <next concrete inspection or edit>
```

Do not load every Paper Plugin skill by default. Load only the selected skill entrypoint and the specific references needed for the current lane.

## Open as needed

- `references/routing-matrix.md` for trigger signals, skill mapping, lane order, and out-of-scope rules.

