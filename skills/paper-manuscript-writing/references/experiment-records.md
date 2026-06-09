# Experiment Records & Reproducibility (paper-scoped)

ARIS's "experiment automation" is mostly research *execution* (running experiments, scheduling queues) — **out of scope** for a paper toolkit. What a *paper* needs is the paper-scoped slice: every experimental claim is **recorded and reproducible**. That maps onto existing structures; no new platform.

## In scope (paper-relevant)

- Each experimental claim → an evidence record: setup, dataset, metric, result, and how to reproduce (code commit / data id / environment).
- Reproducibility status lives in the claim ledger: `context.ts` already supports `reproduction_verified` as a claim support status.
- Experiment artifacts (logs, result tables, figures) are materials → register them (Material Passport, `sources.json`) with provenance `obtained: measured|generated`.
- Data/code availability → `paper-data` (FAIR, repository, accession).

## Out of scope (do NOT build)

- Running experiments, scheduling/queueing runs, hyperparameter sweeps, MLOps. **paper-plugin frames and delivers a paper; it is not an experiment platform.**

## Convention

For each experimental claim in the manuscript:
1. record `setup / data / metric / result` in the evidence ledger;
2. set claim support to `reproduction_verified` **only** when a reproduction path (code + data + environment) exists and was checked;
3. unreproducible or illustrative results must not be stated as verified (cf. `context-quality-gates.md`, `thesis-claim-audit.md`).
