# Project Context Migration

Use non-destructive adoption for existing thesis projects.

## v0 Detect

Read only. Detect:

- `thesis.yaml`
- `content/`
- `assets/`
- `format/`
- `output/`
- `.thesis.json`
- existing DOCX/PDF
- school templates
- task books
- opening reports
- teacher comments
- source code, data, screenshots, figures, videos, and prior outputs

Classify the project as:

- directly adoptable
- missing metadata
- DOCX repair only
- needs authority-source selection

## v1 Adopt

Create `.paper-context/` and registry files that reference existing files.
Do not move, rename, or rewrite old project files.

```bash
npx tsx skills/paper-manuscript-writing/scripts/context.ts init <project-dir>
```

## v2 Validate

Run project gates:

```bash
npx tsx skills/paper-manuscript-writing/scripts/context.ts validate <project-dir> --gate pre-write
npx tsx skills/paper-manuscript-writing/scripts/context.ts validate <project-dir> --gate pre-export
npx tsx skills/paper-manuscript-writing/scripts/context.ts validate <project-dir> --gate pre-archive
```

Check:

- source file hashes
- chapter inventory
- reference integrity
- visual/media state
- latest output DOCX
- `.thesis.json` version outputs
- privacy and stale context

## v3 Normalize

Only with explicit approval:

- create missing directories
- derive template metadata
- generate normalized reports
- create a new semantic version checkpoint

## Rollback

Delete `.paper-context/` to return the project to the old workflow. The legacy
`thesis.yaml + content/ + assets/ + output/ + .thesis.json` workflow must remain
usable.
