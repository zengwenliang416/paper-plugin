# Thesis Visual Evidence

Use this when thesis work involves figures, charts, tables, formulas, screenshots, photo placeholders, image-generation prompts, or user complaints about visual evidence.

## Evidence boundary

- Experimental results, simulation outputs, UI screenshots, physical prototype photos, CAD/drawing views, and measured charts must come from user materials or generated data with a traceable script.
- AI-generated images may be used for concept illustrations, workflow sketches, or temporary placeholders only when they are labeled as such.
- Do not use generated images as real experiment results, real screenshots, real hardware photos, measured diagrams, or proof that a system works.
- A generated visual must not introduce unsupported hardware, software, metrics, labels, scene objects, or conclusions.

## Prompt construction for generated visuals

Before writing a prompt, list:

- source evidence being represented
- elements that must appear
- elements that must not appear
- whether the result is final evidence or a placeholder
- where the image will be placed in the thesis or deck

If the thesis already has a relevant real figure, prefer reserving or improving that figure over generating a replacement.

## Figures, tables, and formulas

- Figure captions go below figures; table titles go above tables.
- Every figure, table, and formula should be referenced in nearby body text before or immediately after it appears.
- Tables should default to three-line style unless the school template says otherwise.
- Do not leave first-line indentation inside table cells.
- Formula numbers should align with the formula according to the school requirement; if export breaks this layout, treat it as a DOCX/layout repair issue rather than a prose issue.

## Validation

- For generated charts, keep the script, source data, and output path together.
- For inserted images, confirm the target DOCX contains media files and that the body references the right figure numbers.
- For screenshots or photos, preserve provenance in notes or filenames when possible.
- When a user provides screenshot feedback, compare against the rendered DOCX/PDF page, not just the source Markdown.
