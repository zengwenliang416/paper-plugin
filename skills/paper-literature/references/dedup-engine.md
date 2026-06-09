# Dedup Engine

Unified deduplication logic shared by all workflows that merge literature result lists
(Workflow 1 multi-source search, Workflow 2 citation verification, Workflow 5a related papers).

## Primary Key: DOI

1. Extract DOI from each record. Match `10.\d{4,}/[^\s]+` pattern.
2. Strip leading `https://doi.org/` prefix if present.
3. Normalize: lowercase, trim whitespace.
4. Records sharing a normalized DOI are duplicates.

## Fallback Key: Title + First Author

When DOI is missing from either record:

1. **Normalize titles:**
   - Lowercase
   - Remove punctuation (.,;:!?()[]"")
   - Remove English stopwords (a, an, the, in, of, for, on, to, and, with, by, et, al)
   - Collapse multiple whitespace to single space
   - Strip leading/trailing whitespace
2. **Tokenize:** split normalized titles into word tokens.
3. **Compute Jaccard similarity:**
   - `intersection = set(tokens_A) & set(tokens_B)`
   - `union = set(tokens_A) | set(tokens_B)`
   - `similarity = len(intersection) / len(union)` if union non-empty, else 0
4. **Compare first-author surnames:**
   - Extract surname: take the first author string, split on commas, take first token, lowercase, strip.
   - Two records match if surnames are identical AND Jaccard similarity >= 0.90.

## Merge Preference

When a duplicate pair spans sources, prefer the record with (in order):
1. More complete metadata (DOI + volume + pages all present)
2. Publisher source over preprint source
3. Higher citation count as tiebreaker

## Usage in Workflows

- **Workflow 1 (Multi-source search):** After parallel MCP search, run dedup on merged result list before ranking/presentation.
- **Workflow 2 (Citation verification):** When a document reference resolves to multiple candidate matches, use dedup to collapse identical candidates before classification.
- **Workflow 5a (Related papers):** When related-paper results overlap with the source search, dedup before presenting.

## Implementation

`scripts/dedup.ts` implements this spec deterministically: DOI primary key (pattern `10.\d{4,}/…`, `https://doi.org/` prefix stripped, lowercased) → title (stopword-stripped) + first-author surname with Jaccard ≥ 0.90 fallback → merge preference (metadata completeness, then publisher over preprint, then citation count).

```bash
npx tsx skills/paper-literature/scripts/dedup.ts records.json        # dedup a merged result list
npx tsx skills/paper-literature/scripts/dedup.ts --classify cases.json # unit-tested core
```

The pure core is contract-tested in `tests/dedup-contract.mjs` (11 cases). A record carries `{ id?, doi?, title?, firstAuthor?, source?, year?, citationCount?, volume?, pages? }`.
