# Overleaf Integration

Sync the LaTeX track with Overleaf (online collaborative LaTeX). Overleaf is an external service; this **wires** the local LaTeX track to it — no account or credential is bundled.

## Sync paths

- **Git bridge** (Overleaf Premium): each project exposes a git remote → clone/push the `.tex` there.
- **GitHub sync** (Overleaf Premium): link an Overleaf project to a GitHub repo.
- **Zip**: Overleaf Menu → Download as ZIP / Upload project — for a one-shot import/export.

## Round-trip

1. Export the manuscript to LaTeX (`latex-export.md`) → push to Overleaf (git/zip).
2. Co-authors edit and compile on Overleaf.
3. Pull back the `.tex` + build log → diagnose with `latex-diagnose.ts`, visually QA with `render-latex.ts`.
4. Verify citations with `paper-literature/verify-refs.ts` regardless of where it compiled.

## Boundary

- Overleaf git tokens / credentials stay in the user's environment — never in the repo.
- Overleaf is the **collaboration surface**; the source of truth stays in the local track unless the team decides otherwise.
- Compilation happens on Overleaf; local `render-latex.ts` is for offline QA of a pulled build.
