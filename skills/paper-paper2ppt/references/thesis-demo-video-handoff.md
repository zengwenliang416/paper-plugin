# Thesis Demo Video Handoff

Use this when a thesis defense needs a deck plus a software, simulation, experiment, or operation demonstration.

## Output boundary

State which output is being produced:

- slide plan or prompt
- talk track
- visual/video asset map
- real `.pptx` handoff package
- demo video script or operation manual

If a real `.pptx` is required, hand off the slide plan, visual map, and talk track to a presentation-generation tool. Do not call a Markdown outline a finished deck.

## Demo script fields

| Field | Meaning |
| --- | --- |
| segment | intro, environment, operation, result, limitation, closing |
| duration | target seconds |
| screen/action | what appears or what the presenter does |
| narration | exact or bullet talk track |
| evidence source | code, screenshot, model, log, video, data, or thesis figure |
| fallback | what to show if the asset is missing |

## Deck and video split

- PPT explains problem, method, design, result, and conclusion.
- Video demonstrates dynamic operation, simulation process, software workflow, or experimental procedure.
- Do not overload slides with step-by-step operation when a video/manual is expected.
- Do not invent operational success that the video, screenshots, logs, or thesis do not support.

## Handoff package

For a full defense handoff, include:

- slide outline with page count and purpose
- `visual_map` with figure/video source paths
- `talk_track` for each slide
- `demo_script` for 3-5 minute operation or simulation video when relevant
- missing asset list and fallback plan

