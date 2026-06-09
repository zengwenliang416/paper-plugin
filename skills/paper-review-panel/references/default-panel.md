# Default Review Panel

`init-review-panel.ts --default` writes the panel below — verified working on 2026-06-08.

```yaml
enabled: true

endpoints:
  minimax:
    base_url: https://api.minimaxi.com/anthropic
    model: MiniMax-M3
    auth_env: MINIMAX_KEY
    max_tokens: 800
    output: standard
  mimo:
    base_url: https://token-plan-cn.xiaomimimo.com/anthropic
    model: mimo-v2.5-pro
    auth_env: MIMO_KEY
    max_tokens: 1500
    output: thinking-first

lenses:
  rigor: 逻辑严谨 / 夸大表述
  citation: 引用真实 / 数据支撑
  completeness: 结构完整 / 格式

panel:
  - { endpoint: minimax, lens: rigor,        weight: 2, veto: false }
  - { endpoint: mimo,    lens: citation,     weight: 1, veto: true }
  - { endpoint: minimax, lens: completeness, weight: 1, veto: false }

verdict:
  rule: weighted
  max_rounds: 2
```

## Required environment variables

The user must export these before a review run (the config only stores the names):

| auth_env | endpoint | how to get it |
| --- | --- | --- |
| `MINIMAX_KEY` | MiniMax (`MiniMax-M3`) | MiniMax console API key |
| `MIMO_KEY` | Xiaomi MiMo (`mimo-v2.5-pro`) | Xiaomi MiMo token-plan key |

Example (do not commit real keys):

```bash
export MINIMAX_KEY="…"
export MIMO_KEY="…"
```

## Notes from endpoint testing

- `MiniMax-M3`: standard Anthropic response structure; works directly.
- `mimo-v2.5-pro`: needs larger `max_tokens` (long thinking) and emits a non-standard structure (thinking block first, empty signature) → `output: thinking-first`, parse defensively.
- Both support Chinese and multi-turn conversation, so review → revise → re-review rounds are viable.

## Optional lens: adversarial (devil's advocate)

Beyond the three default lenses, `review-lenses/adversarial.md` adds a **devil's
advocate** reviewer that only attacks — it surfaces the reject reasons a hostile
reviewer would raise, instead of scoring balanced strengths/weaknesses. It is **not**
in the default panel (one extra API call); enable it for a pre-submission stress test
by adding the lens and a panel row:

```yaml
lenses:
  adversarial: 魔鬼代言人 / 压力测试
panel:
  - { endpoint: mimo, lens: adversarial, weight: 1, veto: false }
```

Read the resulting verdict as an editorial decision via
`references/editorial-decision-standards.md`.
