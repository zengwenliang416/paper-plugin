# Paper Plugin

Local Codex plugin for paper reading, research notes, and academic writing workflows.

## Structure

- `.codex-plugin/plugin.json` - plugin manifest
- `skills/` - Codex skills exposed by the plugin
- `scripts/` - local development and validation scripts
- `assets/` - optional icons, logos, and screenshots

## Development

Validate the plugin metadata and skill files:

```bash
npm run validate
```

Add new skills under `skills/<skill-name>/SKILL.md`. Keep skill names lower-case
kebab-case, and include `name` and `description` in the frontmatter.

## Next Steps

1. Replace manifest author, repository, homepage, and branding metadata when
   the plugin is ready to publish.
2. Expand `skills/paper-assistant/SKILL.md` into the workflow you want Codex to
   follow.
3. Add icons or screenshots under `assets/` if this plugin will be shown in a
   plugin marketplace UI.
