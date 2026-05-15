# Paper Plugin

Codex plugin for the academic paper lifecycle: reading, manuscript writing, literature and citation workflows, reviewer responses, paper-to-PPT, figures, and data statements.

The default prompts highlight the primary entry points for the first migration phase, while the full public skill surface is listed below.

The `thesis-writer/` and `nature-skills-main/` directories remain in the repository as migration sources and are not part of the public plugin surface.

## Public Skills

- `paper-reader`
- `paper-manuscript-writing`
- `paper-literature`
- `paper-response`
- `paper-paper2ppt`
- `paper-figure`
- `paper-data`

## Development

Validate the plugin and skill packages:

```bash
npm run validate
```

Additional release-audit commands are tracked in [docs/migration-notes.md](docs/migration-notes.md).

## Repository Layout

- `.codex-plugin/plugin.json` - plugin manifest
- `skills/` - public Codex skill packages
- `docs/` - design, plans, migration notes
- `scripts/` - current plugin validation tooling and future migration helpers
- `assets/` - plugin-level visual assets
