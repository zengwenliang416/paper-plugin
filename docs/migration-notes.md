# Migration Notes

This file records the release audit and migration closure state of the plugin repository.

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
- [x] legacy source directories have been removed from the plugin repository

## Source repository status

The full public product surface lives under `skills/`.

The plugin no longer keeps `thesis-writer/` or `nature-skills-main/` inside the
repository root. Those source trees were used during migration and have now been
removed so the repository contains only the plugin product surface and its
supporting docs/tooling.

## Project context migration

Existing `thesis.yaml + content/ + assets/ + output/ + .thesis.json` projects
can adopt `.paper-context/` non-destructively. The context layer records source
paths, hashes, ledgers, version pointers, and validation state without replacing
the existing manuscript/export workflow.

Rollback remains simple: delete `.paper-context/` and continue using the old
project structure.
