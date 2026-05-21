# Visual Evidence Manifest

Use this when a thesis has screenshots, photos, generated images, CAD/DWG/DXF, simulation outputs, charts, formulas, or user complaints about wrong/missing figures.

## Manifest fields

| Field | Meaning |
| --- | --- |
| figure_id | figure/table/formula number or temporary id |
| title | caption or intended title |
| chapter | target chapter or slide |
| source_type | screenshot, photo, CAD, simulation, chart, generated concept, placeholder |
| source_path | local file, script, drawing, model, data, or user-provided asset |
| ai_generated | yes/no/unknown |
| placeholder | yes/no |
| evidence_status | evidence, illustration, placeholder, missing, or unsupported |
| body_reference | nearby paragraph that cites or explains it |
| action | keep, improve, replace, redraw, delete, or request source |

## AI replacement gate

Do not replace these with AI-generated images:

- system running screenshots
- test result screenshots
- physical prototype photos
- CAD/DWG/DXF drawings
- simulation result plots/screenshots
- measured curves, experiment charts, or data-backed result figures

AI images are acceptable only for concept illustrations, workflow sketches, architecture diagrams, or explicit placeholders. They must be labeled as non-evidence when they do not prove a result.

## Original media protection

Before replacing figures:

1. Extract or inventory existing media when practical.
2. Identify which body paragraphs cite each figure.
3. Keep usable original evidence figures unless the user explicitly asks to replace them.
4. Record any replacement reason in the manifest.

## DOCX checks

For inserted or repaired visuals, check:

- media file exists in the DOCX package
- relationship target is valid
- figure caption is below and table title is above
- numbering is continuous
- table paragraphs have no unwanted first-line indent
- image-only paragraphs use the required spacing
- formula numbers are on the same line when required

