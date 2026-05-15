# paper-data contract test

Use this fixture to verify that `paper-data` produces journal-ready data availability guidance
rather than generic data-management advice.

## Input shape

- target journal or Nature-style submission context
- whether data were generated, analysed, both, or neither
- repository or accession details if known
- any access restriction rationale

## Pass when

- the output produces a publishable data availability statement or an explicit placeholder draft
- missing repository, accession, or restriction details are flagged instead of invented
- FAIR-oriented guidance stays tied to statement readiness for submission

## Fail when

- the output drifts into a full data-management plan unrelated to manuscript submission
- repository identifiers or accession numbers are fabricated
- restrictions are justified with vague language instead of a concrete reason or placeholder
