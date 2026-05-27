# Context Contract

The project context workflow passes when:

- `context.ts --help` runs.
- `context init` creates `.paper-context/`.
- `context load --format json` returns manifest, versions, and snapshot data.
- `context snapshot` writes a snapshot file.
- `context validate` passes the valid synthetic fixture.
- `context validate` blocks synthetic fixtures for:
  - missing configured chapter
  - stale final output
  - unsupported high-risk claim
  - dangling citation
  - AI-generated evidence figure
  - missing data/source-data provenance
  - unverified final DOCX render evidence
  - private environment file

Fixtures must be synthetic and must not contain real user paper materials.
