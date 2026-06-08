# Review Panel Contract

`.paper-context/review-panel.yaml` configures multi-model, multi-perspective review. Four layers: `endpoints`, `lenses`, `panel`, `verdict`.

## Schema

```yaml
enabled: true            # boolean. false → review panel off; nothing else is validated.

endpoints:               # id -> endpoint. Required when enabled.
  <id>:
    base_url: <url>          # required
    model: <model-name>      # required
    auth_env: <ENV_VAR_NAME> # required. Name of the env var holding the key. NEVER the key itself.
    max_tokens: 800          # optional, positive integer (default 800)
    output: standard         # optional: "standard" | "thinking-first" (default "standard")

lenses:                  # id -> short human description. Required when enabled.
  <id>: <description>        # prompt template lives in references/review-lenses/<id>.md

panel:                   # list of reviewers. Required when enabled, non-empty.
  - endpoint: <id>           # must resolve in endpoints
    lens: <id>               # must resolve in lenses
    weight: 1                # optional, positive number (default 1)
    veto: false              # optional boolean (default false)

verdict:
  rule: weighted             # "weighted" (only supported value this version)
  max_rounds: 2              # optional, positive integer (default 2)
```

## Field rules

- `enabled` must be a boolean. When `false`, validation passes immediately and the rest is ignored.
- Each `endpoints.<id>` must have non-empty `base_url`, `model`, `auth_env`.
- `auth_env` must look like an environment-variable name (`^[A-Z_][A-Z0-9_]*$`), not a key value.
- `output` ∈ {`standard`, `thinking-first`}. Use `thinking-first` for endpoints whose response puts the thinking block first / leaves signatures empty (e.g. MiMo) — the consumer parses defensively and gives them larger `max_tokens`.
- Every `panel[]` entry must reference an existing `endpoint` and `lens`.
- A single endpoint may appear in multiple panel rows with different lenses ("single-model, multi-perspective").
- `verdict.rule` must be `weighted`. `max_rounds` must be a positive integer.

## Security rules

- The file stores `auth_env` **names** only. Real keys live in environment variables.
- Validation **hard-fails** (`SECRET_IN_CONFIG`, P0) if any value matches a key-like pattern: `sk-[A-Za-z0-9_-]{16,}`, `tp-[A-Za-z0-9_-]{16,}`, `AKIA[0-9A-Z]{16}`, or `BEGIN … PRIVATE KEY`.
- A referenced env var that is not set produces a warning (`AUTH_ENV_NOT_SET`, P1), not a hard failure — so configs validate on machines that have not exported the key yet.

## Validation findings

`scripts/validate-review-panel.ts` prints `{ status, summary, findings[] }`. `status` is `skipped` (no file), `passed`, or `blocked`. Each finding: `{ severity, code, blocking, target, message, required_action }`. P0 is blocking.

| code | severity | meaning |
| --- | --- | --- |
| `REVIEW_PANEL_INVALID_YAML` | P0 | file is not valid YAML |
| `ENABLED_NOT_BOOLEAN` | P0 | `enabled` is missing or not a boolean |
| `ENDPOINTS_EMPTY` | P0 | enabled but no endpoints |
| `ENDPOINT_FIELD_MISSING` | P0 | endpoint missing `base_url`/`model`/`auth_env` |
| `AUTH_ENV_INVALID_NAME` | P0 | `auth_env` is not a valid env-var name |
| `ENDPOINT_OUTPUT_INVALID` | P0 | `output` not in {standard, thinking-first} |
| `SECRET_IN_CONFIG` | P0 | a plaintext key-like value is present |
| `LENSES_EMPTY` | P0 | enabled but no lenses |
| `PANEL_EMPTY` | P0 | enabled but empty panel |
| `PANEL_UNKNOWN_ENDPOINT` | P0 | panel row references an undefined endpoint |
| `PANEL_UNKNOWN_LENS` | P0 | panel row references an undefined lens |
| `PANEL_WEIGHT_INVALID` | P0 | `weight` is not a positive number |
| `VERDICT_RULE_INVALID` | P0 | `verdict.rule` is not `weighted` |
| `VERDICT_MAX_ROUNDS_INVALID` | P0 | `max_rounds` is not a positive integer |
| `AUTH_ENV_NOT_SET` | P1 | referenced env var is not currently exported (warning) |
