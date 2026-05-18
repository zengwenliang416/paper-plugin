# OOXML Repair Rules

## Scope

These rules are for generic DOCX delivery fixes. They apply to theses, reports, manuscripts, and template-based documents. Do not add domain-specific facts, equipment names, chapter content, or project-specific wording here.

## Safe Repair Order

1. Inspect the existing DOCX package.
2. Identify whether the issue is source-content, style, field, table, or render related.
3. Back up before in-place edits.
4. Apply the smallest OOXML patch that fixes the observed issue.
5. Re-open the DOCX as a ZIP and re-scan the relevant XML.
6. Render or visually inspect affected pages when layout is part of the complaint.

## Common Generic Fixes

- **Table paragraphs:** remove direct `w:firstLine`, `w:firstLineChars`, `w:hanging`, and `w:hangingChars` from paragraphs inside `w:tbl`. Keep other indentation attributes such as `w:left` when present.
- **Cross-reference fields:** when `REF` fields visually inherit caption formatting, add `\* CHARFORMAT` to the field instruction and keep the visible result text styled like the surrounding paragraph.
- **Figure/table references:** if the user asks for real Word cross-references, add bookmarks to caption labels and replace body text such as `图2-1` or `表3-2` with `REF` fields. Treat this as an opt-in repair because it rewrites body paragraphs.
- **TOC levels:** normalize generated TOC result paragraph styles by heading text shape: `摘要` / `ABSTRACT` and `1.` headings as `TOC1`, `1.1` as `TOC2`, `1.1.1` as `TOC3`.
- **Update fields:** set `w:updateFields w:val="true"` in `word/settings.xml` so Word refreshes fields on open.

## Validation Checks

- DOCX ZIP package can be read after repair.
- `word/document.xml` still exists.
- table paragraph indent report shows no remaining direct first-line or hanging indentation when table cleanup was requested.
- `REF` field report shows all modified REF instructions contain `\* CHARFORMAT`.
- TOC result paragraph report no longer contains unexpected `TOC10`-style levels for normal heading entries.

## When To Avoid Automatic Repair

- The document uses tracked changes, complex content controls, or protected forms.
- The user needs exact school template behavior and has supplied a template that should be parsed first.
- Caption labels are split across many styled runs in a way the repair script cannot safely isolate.
- The requested change is actually content writing, not DOCX structure repair.
