# Migration Notes

This file currently records release-surface completion for the first migration phase only, not full repository migration completion.

## Release-surface checklist

- [x] plugin manifest describes an academic paper full-stack plugin
- [x] default prompts expose reader, writing, and literature workflows
- [x] root README is product-facing rather than scaffold-facing
- [x] no placeholder `paper-assistant` messaging remains

## Final cleanup checklist

- [x] all seven public skills exist
- [x] no placeholder skill remains
- [x] README is product-facing
- [x] validators pass
- [x] upstream source directories are intentionally retained as migration evidence and not part of the public plugin surface

## Source directory status

The full public product surface lives under `skills/`.

The `thesis-writer/` and `nature-skills-main/` directories remain in place as
migration evidence and source directories only. They are intentionally retained
for traceability at this stage and are not part of the public plugin surface.
