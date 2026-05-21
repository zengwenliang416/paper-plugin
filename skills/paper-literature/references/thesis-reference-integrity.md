# Thesis Reference Integrity

Use this when a thesis task changes references, replaces weak sources, reduces web references, updates recent literature, or asks whether citations correspond to the bibliography.

## Source verification

- Verify candidate references against public bibliographic evidence whenever possible: DOI, Crossref, PubMed, publisher pages, CNKI/official metadata supplied by the user, RFC/standards pages, or library records.
- Treat task-book or generated reference lists as untrusted until verified. If a title, author, venue, year, volume, issue, or page range cannot be matched, mark it suspicious and search for a real replacement.
- Do not fill a bibliography with loosely related web pages just to satisfy a count. Web references should be limited and justified by the school requirement or topic need.
- If API/search access is unavailable, keep a verification-status note instead of presenting the bibliography as fully verified.

## Citation synchronization

Before editing references:

1. Locate the current bibliography boundary in the editable source or DOCX.
2. Scan all body citation markers, including ranges such as `[4-6]` and combined forms such as `[2,5,7]`.
3. Build a mapping from in-text citation order to bibliography entries.
4. Identify high-number citations, missing bibliography targets, uncited references, duplicate entries, and references cited only in deleted text.

After editing references:

- renumber in-text citations and bibliography together
- preserve citation ranges only when every referenced item remains adjacent after renumbering
- rewrite the minimum body paragraphs needed when a removed reference supported a claim
- keep `content/references.md`, BibTeX/RIS files, verification notes, and DOCX bibliography in sync when those artifacts exist

## In-place DOCX reference repair

When the user asks to edit a specific Word file directly:

- do not rebuild the whole thesis unless asked
- identify the bibliography block and adjacent section boundaries first
- update only the bibliography and required citation-dependent body paragraphs
- validate the DOCX package and render/openability after XML surgery
- state clearly whether any non-reference body paragraphs were changed

## Final integrity checklist

- every bibliography item is cited at least once
- every in-text citation resolves to a bibliography item
- numbering is sequential by first appearance for GB/T 7714 sequential style
- source types and punctuation are consistent
- web references are within the expected count
- unverified or partially verified items are explicitly labeled
