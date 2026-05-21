# Thesis Layout Scan Contract

Use this when a DOCX thesis must be checked more deeply than "can open" or "XML is valid".

## Scan dimensions

Record counts and risky findings for:

- sections: `w:sectPr`, page size, margins, page-number restart, header/footer links
- front matter: cover, abstract, TOC, declarations, main-text start, references, acknowledgements
- TOC: field presence, static text fallback, levels, rendered page numbers
- media: referenced images, unreferenced media files, missing relationships, oversized images
- captions: figure captions below figures, table titles above tables, sequence continuity
- tables: border model, three-line table candidates, cell paragraph indentation, cross-page risk
- formulas: isolated formula numbers, same-line formula-number layout, OMML or image fallback
- references: bibliography indentation, in-text citation markers, hanging/first-line consistency

## Report fields

Use a compact report with these fields:

| Field | Meaning |
| --- | --- |
| package_ok | DOCX ZIP opens and required parts exist |
| xml_parts_checked | document, styles, settings, headers, footers, rels |
| rendered_checked | none, LibreOffice PDF, Word/WPS visual, or screenshot comparison |
| table_indent_issues | count of table paragraphs with direct first-line or hanging indent |
| three_line_table_issues | count of tables with inner vertical/full grid borders when not allowed |
| formula_number_issues | count of formula numbers detached from formula lines |
| media_issues | missing, unreferenced, or suspicious media counts |
| toc_issues | level mismatch, static TOC, stale pages, or field-refresh risk |
| unresolved_visual_risk | what still needs manual preview |

## Repair routing

- Existing formatted DOCX: patch OOXML narrowly, write a copy or backup, then rescan.
- Markdown/export pipeline: fix reference DOCX, Lua filter, or postprocess script, then regenerate.
- Screenshot complaint: compare against rendered DOCX/PDF page, not just source Markdown.
- School-template complaint: parse the supplied template before approximating fonts, spacing, page sections, or table borders.

Do not claim visual correctness unless a rendered output or user-visible page was checked.

