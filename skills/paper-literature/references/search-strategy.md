# Search Strategy

## Turn claims into searchable concepts

Break each sentence into:

- `phenomenon`: what is being claimed
- `entity`: gene, protein, pathway, compound, intervention, technology, population, or ecosystem
- `relationship`: increases, decreases, predicts, regulates, causes, associates with, improves, detects
- `context`: species, tissue, disease, cell type, geography, time period, device, method, or dataset
- `boundary`: "in cancer cells", "after treatment", "in older adults", "under drought", etc.

Create search queries at three levels:

1. `precise`: entity + relationship + outcome + context
2. `synonym`: alternate names and abbreviations
3. `broad`: field context if no direct paper is found

For Chinese claims, translate the scientific concepts, not the sentence literally. Keep acronyms and
standard nomenclature unchanged.

## Support grading

Use the smallest support grade that is defensible:

| Grade | Meaning | Good use |
|---|---|---|
| strong support | Directly tests the same core relationship in a similar context | Experimental, mechanistic, or quantitative manuscript claims |
| partial support | Supports one component or a narrower setting | Carefully qualified claims |
| background support | Establishes field context or prior observation | Introduction/background sentences |
| contradictory/limiting | Conflicts with or narrows the claim | Discussion, limitations, or avoid citing as support |
| metadata-only candidate | Metadata suggests relevance; abstract/full text not checked | Screening only |

## Evidence note template

```text
Claim: [original claim]
Paper: [first author/year/title/journal/DOI]
Support grade: [grade]
Evidence basis: [title/abstract/publisher page/full text]
Reasoning: [why the result supports or does not support the exact claim]
Citation wording: [how to phrase the manuscript sentence if using this citation]
```

## Common failure modes

- The paper is related to the same disease but tests a different mechanism.
- The paper supports an association, but the manuscript sentence claims causality.
- The evidence is in a different species, cell type, or clinical population.
- A review is used as primary evidence when original research exists.
- The claim is too broad for a single citation.
- The searched journal title contains "Nature" but is not a Nature Portfolio journal.

## Better search moves

- Add the method or model when results are broad: `single-cell`, `CRISPR screen`, `organoid`,
  `randomized`, `cohort`, `meta-analysis`, `cryogenic electron microscopy`.
- Add context terms when there are many irrelevant hits: tissue, species, cell type, disease subtype,
  exposure, intervention, or outcome.
- Search the opposite direction if the claim might be overconfident: `inhibits` vs `activates`,
  `resistance` vs `sensitivity`, `risk` vs `protective`.
- Use recent limits for fast-moving areas, but remove them if no direct CNS/Nature-series paper appears.

## Multi-source search (external skill / MCP)

`scripts/ref-search.ts` has built-in CrossRef + DBLP search. For wider coverage —
arXiv, PubMed, bioRxiv/medRxiv, Semantic Scholar, Google Scholar, CNKI, Europe PMC,
etc. — attach an external retriever rather than re-implementing connectors. Two good
attach points, by form:

- **academic-search** (`ustc-ai4science/academic-search`, MIT, Claude Code skill) —
  **preferred for Chinese or cross-discipline work**: native **CNKI/知网** support,
  discipline routing, CCF venue tagging, recency-first ranking, query expansion, and
  two-pass search. Same skill form as this plugin, so it drops in directly.
- **paper-search-mcp** (MIT, MCP server or CLI) — preferred as a pure breadth
  backend: 20+ sources behind one MCP interface.

Boundary: the external retriever does **discovery** only. This plugin still owns
**verification** (`scripts/verify-refs.ts` — a search hit is a candidate, not a
verified citation), **dedup** (`scripts/dedup.ts`), and **citation formatting**
(GB/T 7714, `references/gbt7714.md`). Pipe external results through dedup → verify
before they enter the bibliography.

## Finding missed key references

To surface papers a keyword search misses (the ones a reviewer will name), add a
citation/recommendation layer on top of the seed set:

- **Semantic Scholar Recommendations API** — given seed paper(s), returns similar
  work; good for answering "what am I not citing".
- **Citation-network tools** (e.g. the open-source Local Citation Network, over
  OpenAlex / Semantic Scholar / OpenCitations) — from seed articles, surface the
  most relevant *Top Cited* and *Top Citing* papers not yet in your set.

Treat every discovered paper as a candidate: dedup against the current set, then
verify before citing. Discovery widens recall; it does not lower the citation bar.
