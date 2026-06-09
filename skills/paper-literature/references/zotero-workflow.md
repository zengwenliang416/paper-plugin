# Zotero Integration Workflow

Bring a Zotero library into the paper pipeline. Zotero's data formats (RIS, BibTeX via Better BibTeX, CSL-JSON) are **already handled by this skill** — this workflow connects them; it does not re-implement Zotero.

## Import path

1. **Export from Zotero**: right-click collection → Export → BibTeX (Better BibTeX) or RIS. Better BibTeX gives stable citekeys; prefer it.
2. **Normalize**: use the bundled converters (`scripts/converters.py`, `scripts/format-converter.py`) for RIS/EndNote ↔ BibTeX as needed (see `ris-bibtex-format.md`, `ris-endnote.md`).
3. **Verify**: run `scripts/verify-refs.ts <bib>` to drop fabricated/mismatched entries before trusting the library.
4. **Use**: the verified bib feeds citation insertion (`paper-manuscript-writing`), the review skeleton (`paper-research/review-outline.ts`), and GB/T 7714 formatting.

## MCP option

If a Zotero MCP server is configured in the host, the agent may query the library directly (collections, items, attachments) instead of a manual export. Treat MCP results as just another source: **still run `verify-refs.ts` before citing**. The plugin neither bundles nor requires a Zotero MCP; it only consumes one when present.

## Boundary

- This skill **consumes** Zotero data; it does not manage the library or write back to it.
- Any MCP keys/credentials stay in the host config — never in the bib file or the repo.
