# Paper Plugin

Codex plugin for the academic paper lifecycle: reading, manuscript writing, literature and citation workflows, reviewer responses, paper-to-PPT, figures, and data statements.

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
node scripts/validate-skills.mjs
node scripts/check-links.mjs
node scripts/check-no-upstream-leaks.mjs
```

## Repository Layout

- `.codex-plugin/plugin.json` - plugin manifest
- `skills/` - public Codex skill packages
- `docs/` - design, plans, migration notes
- `scripts/` - plugin-level validation and inventory scripts
- `assets/` - plugin-level visual assets
