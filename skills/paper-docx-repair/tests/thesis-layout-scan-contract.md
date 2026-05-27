# Thesis Layout Scan Contract Test

Use this as a manual contract for future DOCX repair changes.

Given a thesis DOCX with table indentation, detached formula numbers, stale TOC pages, and image-spacing complaints, the repair workflow must:

- scan the DOCX package before editing
- report section/page-number state, table paragraph indentation, formula-number issues, media relationships, and TOC risk
- choose existing-DOCX repair instead of Markdown re-export when the user says "就在这个 Word 上改"
- write a repaired copy or backup before in-place mutation
- rescan the changed XML parts after repair
- render the repaired DOCX to page PNGs and inspect every page before claiming visual correctness
- record `png_dir`, `page_count`, `reviewed_pages`, and `status=verified` in `.paper-context/ledgers/docx.tsv` for final archive delivery

The workflow fails this contract if it only reports "DOCX can open", only checks Markdown source, or records DOCX verification without checked page PNGs.
