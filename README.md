# Paper Plugin

Codex plugin for the academic paper lifecycle: reading, manuscript writing, literature and citation workflows, reviewer responses, paper-to-PPT, figures, data statements, and DOCX repair.

The default prompts highlight the primary entry points, while the full public skill surface is listed below.

## Public Skills

- `paper-reader`
- `paper-manuscript-writing`
- `paper-literature`
- `paper-response`
- `paper-paper2ppt`
- `paper-figure`
- `paper-data`
- `paper-docx-repair`

## Development

Validate the plugin and skill packages:

```bash
npm run validate
```

Additional release-audit commands are tracked in [docs/migration-notes.md](docs/migration-notes.md).

## Install From GitHub

This repository also exposes a single-plugin marketplace manifest so Codex can add it directly from GitHub.

Example commands:

```bash
codex plugin marketplace add zengwenliang416/paper-plugin
```

or

```bash
codex plugin marketplace add https://github.com/zengwenliang416/paper-plugin.git
```

After Codex adds the marketplace, open the plugin directory, choose `Paper Plugin Marketplace`, and install `paper-plugin`.

## Repository Layout

- `.agents/plugins/marketplace.json` - Codex marketplace manifest for Git-backed installation
- `.claude-plugin/marketplace.json` - legacy-compatible marketplace manifest
- `.codex-plugin/plugin.json` - plugin manifest
- `skills/` - public Codex skill packages
- `docs/` - design, plans, migration notes
- `scripts/` - plugin validation and maintenance tooling
- `assets/` - plugin-level visual assets
