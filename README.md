# Paper Plugin

Codex plugin for the academic paper lifecycle: reading, manuscript writing, literature and citation workflows, reviewer responses, paper-to-PPT, figures, data statements, DOCX repair, and final DOCX render QA.

The default prompts highlight the primary entry points, while the full public skill surface is listed below.

## Public Skills

- `paper-workflow-router`
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

Render a final DOCX for visual QA:

```bash
npm run docx:render -- <file.docx> --output-dir <render-dir>
```

Additional release-audit commands are tracked in [docs/migration-notes.md](docs/migration-notes.md).

## Install From GitHub

The repository ships marketplace manifests for **both Codex and Claude Code** — the same `skills/` power both runtimes.

### Codex

```bash
codex plugin marketplace add zengwenliang416/paper-plugin
# or: codex plugin marketplace add https://github.com/zengwenliang416/paper-plugin.git
```

After Codex adds the marketplace, open the plugin directory, choose `Paper Plugin Marketplace`, and install `paper-plugin`.

### Claude Code

```bash
/plugin marketplace add zengwenliang416/paper-plugin
/plugin install paper-plugin@paper-plugin-marketplace
```

Skills auto-load after install (no manifest wiring needed). Validate the plugin locally with `claude plugin validate .`.

## Repository Layout

- `.agents/plugins/marketplace.json` - Codex marketplace manifest for Git-backed installation
- `.codex-plugin/plugin.json` - Codex plugin manifest
- `.claude-plugin/marketplace.json` - Claude Code marketplace manifest
- `.claude-plugin/plugin.json` - Claude Code plugin manifest
- `skills/` - skill packages (shared by Codex and Claude Code)
- `docs/` - design, plans, migration notes
- `scripts/` - plugin validation and maintenance tooling
- `assets/` - plugin-level visual assets
