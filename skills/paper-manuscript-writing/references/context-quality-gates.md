# Context Quality Gates

Use this before major writing, DOCX export, final delivery, or archive tagging.
The gate output should be structured and actionable.

## Gates

| Gate | Blocks | P0 blocking conditions |
| --- | --- | --- |
| `pre-write` | final-style drafting or expansion | source of truth unknown, chapter state unknown, high-risk claims have no ledger, code/data/image sources are not inventoried |
| `pre-export` | final DOCX/PDF export | `[TODO]`, missing/contradictory claims, dangling citations, missing visual media, unsupported experiment data, privacy leak |
| `pre-archive` | final tag or delivery package | latest DOCX lacks verified page-PNG render QA, `.thesis.json` points to missing output, stale context, private or temporary files in delivery |

## Finding format

```json
{
  "severity": "P0",
  "code": "CLAIM_EVIDENCE_MISSING",
  "blocking": true,
  "target": "content/ch03.md#实验结果表明",
  "message": "High-risk experimental conclusion has no traceable data, script, or log.",
  "required_action": "Add evidence to claim ledger, or delete/soften the claim."
}
```

## Validation areas

- claim evidence
- citation and bibliography integrity
- figure and media provenance
- data availability and source data
- DOCX package validity, page-PNG render output, reviewed page count, and render ledger evidence
- context freshness
- privacy and local-path leakage
- version pointer consistency

## Override rule

P0 findings require explicit `--force --reason <text>` to continue. The override
must be recorded in the validation report or run record.
