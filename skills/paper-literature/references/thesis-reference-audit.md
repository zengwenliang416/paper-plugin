# Thesis Reference Audit

Use this when a Chinese graduation thesis needs reference verification, bibliography replacement, numeric citation renumbering, or literature-review strengthening.

## Audit workflow

1. Select the editable source: Markdown, DOCX XML, bibliography file, or extracted text.
2. Extract all in-text numeric citations, including `[1]`, `[1-3]`, `[1,3,5]`, `［1］`, and superscripted DOCX runs when possible.
3. Extract bibliography entries and identify their current numbers.
4. Build a citation map: first appearance, old number, new number, referenced paragraphs, and bibliography target.
5. Verify each bibliography item against DOI/Crossref, publisher page, CNKI/Wanfang metadata supplied by the user, RFC/IETF, library record, or other authoritative source.
6. Rewrite or replace only the references that fail verification or no longer support the text.
7. Renumber body citations, bibliography entries, BibTeX/RIS files, and DOCX output together.

## Verification ledger

| Field | Meaning |
| --- | --- |
| old_no | original bibliography number |
| new_no | renumbered item or deleted |
| title | normalized title |
| source_type | journal, conference, thesis, book, standard, web, dataset |
| verification_source | DOI, Crossref, CNKI, Wanfang, publisher, RFC, library, user supplied |
| verification_status | verified, partial, suspicious, replaced, or unavailable |
| citation_locations | sections or paragraphs where cited |
| action | keep, correct metadata, replace, delete, or add citation |

## Web reference control

- Keep web references few and justified.
- Prefer standards, official documents, datasets, software documentation, or policy pages.
- Do not use ordinary web pages to satisfy a target count.
- If a school requires EB/OL formatting, keep access dates and URLs consistent.

## Literature review checks

- Each paragraph making a research-status claim should include citation support.
- Group sources by technical theme, method, dataset, scenario, or limitation instead of listing authors mechanically.
- Explain how each cluster relates to the current thesis.
- Do not cite references that are not used in the paragraph logic.

## Final report

Report citation-map issues, verification statuses, deleted/replaced references, web-reference count, and any claims that lost support after reference changes.

