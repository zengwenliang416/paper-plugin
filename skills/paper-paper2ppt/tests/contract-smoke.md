# paper-paper2ppt contract smoke test

Use this file to manually verify that package outputs stay within the intended contract.

## Pass when

- the output is shaped as a slide outline rather than manuscript prose
- slides include purpose or takeaway cues, not only copied paragraphs
- at least one result slide references a figure cue or placeholder when figures are available
- talk-track notes or discussion prompts are present when the user asks for a presentation workflow

## Fail when

- the package returns a full paper summary with no slide structure
- the package claims to generate a `.pptx` file without an explicit rendering tool
- figure details, slide counts, or presenter claims are invented without source support
