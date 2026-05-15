# Paper Plugin

Codex plugin for the academic paper lifecycle: reading, manuscript writing, literature and citation workflows, reviewer responses, paper-to-PPT, figures, and data statements.

The default prompts highlight the primary entry points for the first migration phase, while the full public skill surface is listed below.

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

Additional validation scripts will be added in a later migration batch.

## Repository Layout

- `.codex-plugin/plugin.json` - plugin manifest
- `skills/` - public Codex skill packages
- `docs/` - design, plans, migration notes
- `scripts/` - plugin-level validation and inventory scripts
- `assets/` - plugin-level visual assets
