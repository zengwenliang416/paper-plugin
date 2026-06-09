# Material Passport (via .paper-context source registry)

Imbad's "Material Passport" idea — every research material carries identity, origin, and trust — is **already served by `.paper-context`**. This note maps the concept onto the existing system and adds a provenance convention. It does **not** introduce a new system.

## Where the passport already lives

`context.ts` registers every material into `.paper-context/registry/sources.json`, one record per file:

- `source_id` — stable identity
- `kind` — docx / pdf / md / image / data / code
- `role` — `authority` vs `derived` (the trust tier)
- `sha256` — content fingerprint: version identity + tamper/drift detection
- `path` + `absolute_path_redacted` — location, privacy-safe
- `mtime_ns`, `content_status`, `notes`

Versions live in `versions.yaml`; evidence/claim/citation/figure provenance lives in `ledgers/`.

## Provenance convention (the only real gap)

`sources.json` has no structured "how was this obtained" field — record it in `notes` with a tag:

```
obtained: downloaded|scanned|generated|measured|provided-by:<who> @ <date / URL / DOI>
```

e.g. `obtained: downloaded @ https://doi.org/10.x 2026-06-09`. **AI-generated material must say `generated`** and must stay `derived` role — never `authority`.

## Trust tiers (role)

- `authority` — primary source of truth (official template, raw data, editable manuscript).
- `derived` — produced from an authority (export, converted bib, generated figure).

Generated/placeholder material stays `derived` and must not back a claim as evidence (see `context-quality-gates.md`).

## Use

Run `context.ts init`/`update` to (re)build the passport; read `manifest.json` counts + `registry/sources.json` to audit every material's identity, trust tier, and provenance before delivery.
