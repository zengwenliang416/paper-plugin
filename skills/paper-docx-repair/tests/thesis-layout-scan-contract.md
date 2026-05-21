# Thesis Layout Scan Contract Test

Use this as a manual contract for future DOCX repair changes.

Given a thesis DOCX with table indentation, detached formula numbers, stale TOC pages, and image-spacing complaints, the repair workflow must:

- scan the DOCX package before editing
- report section/page-number state, table paragraph indentation, formula-number issues, media relationships, and TOC risk
- choose existing-DOCX repair instead of Markdown re-export when the user says "就在这个 Word 上改"
- write a repaired copy or backup before in-place mutation
- rescan the changed XML parts after repair
- render or visually inspect affected pages before claiming visual correctness

The workflow fails this contract if it only reports "DOCX can open" or only checks Markdown source.

