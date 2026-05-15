# Workflow scope

This file defines the minimal package contract for `paper-paper2ppt`.

## Inputs

- paper title and abstract
- main findings or author summary
- figure list or figure captions when available
- audience or talk type, such as journal club or conference update
- target slide count or time limit if the user supplies one

## Outputs

- a slide-outline-shaped Markdown deliverable
- per-slide purpose, headline, and evidence notes
- figure placement cues or placeholders
- talk-track prompts for presenter narration

## Package boundary

`paper-paper2ppt` structures paper content into a presentation workflow. It does not parse raw
PDFs, rewrite the full manuscript, or render a `.pptx` deck by default unless another package or
tool is explicitly involved.
