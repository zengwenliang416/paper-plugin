# Citation Verification Contract

`scripts/verify-refs.ts` automates the wf2 / thesis-reference-audit method: it reads a BibTeX file and verifies each entry against external indexes, then classifies it. This is the **implementation** of citation verification; `wf2-citation-verification.md` and `thesis-reference-audit.md` remain the method/process references.

## Invocation

```bash
npx tsx skills/paper-literature/scripts/verify-refs.ts assets/refs.bib          # human-readable report
npx tsx skills/paper-literature/scripts/verify-refs.ts assets/refs.bib --out .paper-context/ledgers/citation-verification.tsv
npx tsx skills/paper-literature/scripts/verify-refs.ts assets/refs.bib --json    # full JSON
npx tsx skills/paper-literature/scripts/verify-refs.ts --classify fixtures.json  # classify only, no network (tests)
```

## Sources (multi-index triangulation)

- **CrossRef by DOI** — `api.crossref.org/works/{doi}` confirms a declared DOI resolves and returns its title.
- **CrossRef by title** + **OpenAlex by title** (`api.openalex.org`, 250M+ works, no key) run concurrently to cross-check the record.
- Each source is best-effort; a failed source is skipped. All sources failing → `manual_needed`.

## Classification (deterministic, unit-tested via `--classify`)

`classify(entry, evidence)` — the testable core:

1. `evidence.error` (all sources failed) → `manual_needed`.
2. Declared DOI did not resolve → `suspicious` (strong fabrication signal).
3. DOI resolves and its title matches the entry → `verified`; resolves but title differs → `mismatch` (the declared DOI points at a different paper — the real problem case).
4. No DOI: any candidate matching title **and** year → `verified`; a title-exact candidate whose year differs → `verified` with a year note (reprint/preprint noise); only a loose title match with a differing year → `suspicious`.
5. No matching candidate and no records at all → `not_found` (possible fabrication).
6. Records returned but none match the title → `suspicious`.

Title matching normalises case/punctuation (CJK-aware) and falls back to token Jaccard ≥ 0.6.

## Output

- Report: `summary` counts per status + a flagged list (everything not `verified`).
- `--out <tsv>` writes `key, title, doi, verification_status, verification_source, note`.
- Exit `1` when any `not_found` or `mismatch` exists, else `0`.

## Boundary

- **Does not edit the manuscript's `citations.tsv`** (owned by `paper-manuscript-writing`). It emits an independent verification TSV; merging verified statuses into the manuscript ledger is an audit-layer / human step.
- Network only; no secrets involved. Uses a `mailto` for polite-pool API access.
