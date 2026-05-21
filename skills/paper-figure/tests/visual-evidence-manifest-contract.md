# Visual Evidence Manifest Contract Test

A visual-evidence workflow passes when it:

- classifies each visual as evidence, illustration, placeholder, missing, or unsupported
- records source path and source type for screenshots, photos, CAD, simulation, and charts
- blocks AI-generated replacement of real screenshots, photos, CAD, simulation outputs, and measured results
- preserves usable original media unless the user asks for replacement
- checks that DOCX media and captions match body references

It fails if generated images are presented as real screenshots, real experiments, or proof that a system works.

