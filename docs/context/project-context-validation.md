# Project Context Validation

Project validation is implemented by:

```bash
npx tsx skills/paper-manuscript-writing/scripts/context.ts validate <project-dir> --gate <gate>
```

## Gates

| Gate | Blocks |
| --- | --- |
| `pre-write` | final-style drafting or expansion |
| `pre-export` | final DOCX/PDF export |
| `pre-archive` | final tag or delivery package |

## Finding levels

- `P0`: blocking unless explicitly forced with a reason.
- `P1`: warning that should be resolved before final delivery.
- `P2`: advisory.

## Finding shape

```json
{
  "severity": "P0",
  "code": "CLAIM_EVIDENCE_MISSING",
  "blocking": true,
  "target": "content/ch03.md#实验结果表明",
  "message": "High-risk claim has no supported claim ledger row.",
  "required_action": "Add verified evidence to registry/claims.tsv or soften/delete the claim."
}
```

## Covered areas

- project shape and source-of-truth files
- configured chapter existence
- `.thesis.json` parseability and version output paths
- high-risk claim evidence rows
- TODO and missing-evidence markers
- citation/bibliography resolution
- AI-generated or placeholder visuals incorrectly marked as evidence
- latest DOCX missing verified page-PNG render QA for archive delivery
- stale outputs
- environment files, credentials, and local absolute paths
- context version pointer consistency

## Repository validation

Root `npm run validate` runs only synthetic fixtures and plugin contracts. It
must not require real user thesis or paper materials.
