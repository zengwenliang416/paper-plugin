# Thesis Defense Deck

Use this when converting a thesis into a defense-PPT plan, prompt, slide outline, or deck handoff.

## Intake

Read the real thesis sources before planning slides:

- `thesis.yaml` or equivalent metadata
- chapter Markdown or DOCX/PDF draft
- existing figure, screenshot, chart, CAD, simulation, video, or storyboard folders
- teacher requirements, school defense rules, and requested time limit

Do not build the deck only from the title when thesis materials are available.

## Default shape

Unless the user asks for a short deck, plan a fuller defense outline around 14-20 content slides. Include:

- title and research background
- problem and objectives
- technical route or design workflow
- key method/design/system modules
- experiment, simulation, implementation, or validation evidence
- result analysis and limitations
- summary and future work
- a dedicated demo/video slide when a defense video is expected

If one result slide becomes crowded, split it rather than shrinking figures until they are unreadable.

## Figure and video mapping

For each visual slot, provide a mapping table with:

- slide number
- slide title
- image/video source path or placeholder label
- placement purpose
- required crop or sizing notes
- fallback if the asset is missing

Use real thesis images when available. If only a placeholder can be used, make the placeholder explicit and keep the same intended size.

## Claim control

- Use only claims supported by the thesis, data, figures, code, or user materials.
- Prefer cautious wording such as "simulation validation", "process validation", or "scheme verification" when real deployment evidence is absent.
- Do not turn a thesis draft into stronger claims just because slides need to sound polished.

## Output contract

If this skill is not rendering a `.pptx`, state that the output is a slide plan or generation prompt. When a real deck is required, coordinate with a presentation-generation tool or package and keep the figure/video mapping as the handoff contract.

For defenses with software, simulation, experiment, or operation demonstrations, also prepare the handoff described in `references/thesis-demo-video-handoff.md`: `visual_map`, `talk_track`, `demo_script`, missing assets, and fallback plan.
