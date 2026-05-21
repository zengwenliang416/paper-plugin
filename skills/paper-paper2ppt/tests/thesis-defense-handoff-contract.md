# Thesis Defense Handoff Contract Test

A thesis-defense deck workflow passes when it:

- declares whether the output is a prompt, outline, handoff, or real PPTX
- plans enough content slides for the requested defense length
- includes a dedicated demo/video slide when a demonstration is expected
- maps each visual or video slot to a real source path or explicit placeholder
- keeps claims within thesis evidence
- hands off `visual_map`, `talk_track`, and `asset_manifest` when real PPTX generation is needed

It fails if it presents a Markdown prompt as a finished PPTX or uses unsupported claims to make the deck sound stronger.

