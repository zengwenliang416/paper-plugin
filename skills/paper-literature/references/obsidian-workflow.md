# Obsidian Integration Workflow

Bring an Obsidian vault's notes and citations into the paper pipeline. Obsidian notes are Markdown — already the plugin's native format — so this is **wiring, not a new engine**.

## What comes from Obsidian

- **Literature notes** (one note per paper, often via a citation plugin) → candidate references + reading summaries.
- **Citations**: vaults using the Citations / Zotero-integration plugin store BibTeX citekeys → reuse the Zotero path (`zotero-workflow.md`).
- **Idea / permanent notes** → raw material for the research front-end (`paper-research`).

## Import path

1. Point at the vault folder (Obsidian notes are plain `.md`).
2. References: collect the BibTeX/citekeys the vault uses → **verify with `verify-refs.ts` before citing**.
3. Literature notes: treat each as a reading summary; map to a paper via its citekey/DOI.
4. Idea notes: feed into `paper-research` (topic/gap), not directly into the manuscript.

## MCP option

If an Obsidian MCP server is configured, the agent may read vault notes directly. Treat note contents as drafts/sources — verify any reference before citing. The plugin neither bundles nor requires an Obsidian MCP.

## Boundary

- This skill **reads** vault content; it does not manage the vault or write back.
- Wiki-links/embeds (`[[...]]`, `![[...]]`) are Obsidian-specific — resolve or strip them before content reaches manuscript prose.
- Citations still go through `verify-refs.ts`; notes are not authority.
