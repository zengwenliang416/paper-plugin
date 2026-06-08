# Paper Review Panel — 配置初始化 Skill 设计稿

- Date: 2026-06-08
- Status: Draft（待 owner 确认 → 转实现）
- Scope: 新增 `paper-review-panel` skill，负责“多模型多视角审核”的启用开关与评审面板矩阵配置

## 1. 背景与目标

paper-plugin 要吸收竞品（Imbad / ARIS 等）“多模型 + 多视角评审”的优势。**第一步只做配置与初始化**：让用户决定是否启用“多模型多视角审核”，启用时配置一个**评审面板矩阵**（模型端点 × 评审视角）。实际评审执行、重审循环、orchestrator 编排属后续，本稿不实现。

实测依据（2026-06-08）：`MiniMax-M3`、`mimo-v2.5-pro` 两个 Anthropic 兼容端点可用、支持中文与多轮会话；其中 MiMo 需要更大的 `max_tokens`，且输出结构非标准（thinking 块在前、签名为空）。这些约束直接写进配置字段。

## 2. 范围

**In（本稿交付）**
- 新 skill `paper-review-panel`（SKILL.md / README.md / references / scripts / tests）
- 配置契约 `.paper-context/review-panel.yaml`（四层：endpoints / lenses / panel / verdict）
- 初始化流程（启用开关 → 端点 → 视角 → 矩阵 → 默认套用 → 写文件 → 校验）
- 内置默认矩阵 + 各视角 prompt 模板（references/）
- 配置校验脚本（可挂到 `npm run validate`）

**Out（非目标，后续）**
- 实际跑评审、收集 verdict、聚合裁决的执行引擎
- 重审循环、orchestrator 编排、router 改造
- 跨 host（Codex/Claude）真实模型调用实现
- 跨厂商 profile/进程后端的实现（仅在契约层预留扩展位）

## 3. 配置契约 `.paper-context/review-panel.yaml`

```yaml
enabled: true            # 总开关：false → 退化为默认单模型单次评审，全插件行为不变

# ① 模型端点池（密钥只写环境变量名，绝不写明文）
endpoints:
  minimax:
    base_url: https://api.minimaxi.com/anthropic
    model: MiniMax-M3
    auth_env: MINIMAX_KEY      # 真密钥放环境变量，配置只记名字
    max_tokens: 800
    output: standard           # 标准 Anthropic 结构
  mimo:
    base_url: https://token-plan-cn.xiaomimimo.com/anthropic
    model: mimo-v2.5-pro
    auth_env: MIMO_KEY
    max_tokens: 1500           # 实测：MiMo 思考长，token 要给大
    output: thinking-first     # 实测：结构非标准，解析走容错

# ② 视角库（每个视角 = 一个评审角度，prompt 模板放 references/review-lenses/）
lenses:
  rigor:        逻辑严谨 / 夸大表述
  citation:     引用真实 / 数据支撑
  completeness: 结构完整 / 格式

# ③ 评审矩阵：把“哪个模型 × 哪个视角”配成评审员
panel:
  - { endpoint: minimax, lens: rigor,        weight: 2, veto: false }
  - { endpoint: mimo,    lens: citation,     weight: 1, veto: true  }   # 引用硬伤→一票打回
  - { endpoint: minimax, lens: completeness, weight: 1, veto: false }

# ④ 裁决规则
verdict:
  rule: weighted        # 加权投票
  max_rounds: 2         # 最多再评 2 轮（执行引擎后续实现，配置先 pin）
```

**字段约定**
- `endpoints.<id>`：`base_url`、`model`、`auth_env`(必填，环境变量名)、`max_tokens`(默认 800)、`output`(`standard` | `thinking-first`)。
- `lenses.<id>`：人读简述；对应 `references/review-lenses/<id>.md` 的 prompt 模板。
- `panel[]`：`endpoint`(引用 endpoints 的 id)、`lens`(引用 lenses 的 id)、`weight`(默认 1)、`veto`(默认 false)。
- `verdict`：`rule`(本期仅 `weighted`)、`max_rounds`(默认 2)。

**不变量 / 安全**
- 密钥**只存 `auth_env`**；校验拒绝明文密钥（命中 `sk-`/`tp-` 等模式即硬失败）。
- `panel` 中的 `endpoint`/`lens` 必须能在 endpoints/lenses 中解析，否则失败。
- **单端点也可用**：`panel` 多条复用同一 `endpoint`、不同 `lens`，即“单模型多视角”。
- `enabled: false`：插件行为与现状完全一致（向后兼容）。

## 4. 新 skill 形态（满足 validate-skills / validate-plugin）

```
skills/paper-review-panel/
  SKILL.md                       # frontmatter name=paper-review-panel; H1 "Paper Review Panel"
  README.md                      # H1 与 SKILL.md 一致
  references/
    review-panel-contract.md     # 配置 schema、字段、校验规则、安全约定
    default-panel.md             # 内置默认矩阵说明
    review-lenses/
      rigor.md                   # 各视角的评审 prompt 模板
      citation.md
      completeness.md
  scripts/
    init-review-panel.ts         # 生成/更新 review-panel.yaml（交互 + 非交互）
    validate-review-panel.ts     # schema/安全/引用完整性校验（可被 npm run validate 调）
  tests/
    review-panel-cases.json      # 确定性校验用例（类比 routing-cases.json）
    validate-review-panel-contract.mjs
```

## 5. 初始化流程（skill 行为）

1. 问：**启用多模型多视角审核吗？**（是/否）。否 → 写 `enabled: false`，结束。
2. 是 → 选 **一键默认** 或 **手动**：
   - 一键默认：套用内置矩阵（MiniMax+MiMo+三视角），并提示用户设置对应环境变量。
   - 手动：逐个加端点（`base_url`/`model`/`auth_env`/`max_tokens`/`output`）→ 选/加视角 → 配 `panel`（endpoint×lens、weight、veto）→ `verdict`。
3. 写 `.paper-context/review-panel.yaml`。
4. 校验：schema 合法性 + `auth_env` 环境变量是否存在（缺失给**警告**）+ 不含明文密钥（**硬失败**）。
5. 可选连通性自检：对每个端点发一个最小请求确认可达（失败仅警告，不阻断写入）。

## 6. 内置默认矩阵

即第 3 节示例（MiniMax `rigor`+`completeness`、MiMo `citation` 且 `veto:true`，`weighted` / `max_rounds:2`）。`init` 选“一键默认”时写入此内容并打印需要设置的环境变量名清单。

## 7. 兼容与边界

- **不改 router 运行时**；router 后续可只读 `review-panel.yaml` 状态，但本稿不动 router。
- 配置落在 `.paper-context/`（与 `manifest.json`/`versions.yaml` 同级）；**context owner 仍是 `paper-manuscript-writing`**，本 skill 只拥有 `review-panel.yaml` 这一文件。
- 不破坏现有 `npm run validate`；新增 `validate-review-panel` 作为附加步骤（无 `.paper-context` 或 `enabled:false` 时跳过/通过）。
- `enabled: false` 时整插件零行为变化。

## 8. 验收标准

- `skills/paper-review-panel` 通过 `validate-skills.mjs` 与 `validate-plugin.mjs`。
- `init-review-panel.ts` 能生成合法 `review-panel.yaml`（默认路径 + 手动路径各跑通一次）。
- `validate-review-panel.ts`：合法配置通过；明文密钥 / 未知 endpoint 或 lens 引用 / 缺必填字段 → 失败，且有对应测试用例。
- `enabled: false` 时，现有工作流（导出 / 渲染 QA / 路由）输出零变化。
- 文档齐全：SKILL.md、README.md、三类 reference。

## 9. ADR 信号（供后续 backfill，不在本稿落定）

- 新增配置契约 `review-panel.yaml` = 新的 source-of-truth / artifact，后续评审执行引擎依赖它 → ADR 候选。
- “reviewer 后端可插拔”（in-session 子代理 / profile-进程 / 跨厂商）为未来扩展点，本稿仅在契约层预留。

## 附：对话已固化的关键决策

- 运行形态：**混合式**（代码持契约/调度/聚合，LLM 做语义评审）。
- owner 边界：编排归未来独立 orchestrator；**本稿先落配置层**。
- jury：跨模型 × 多视角；裁决 = 加权 + 关键视角 veto；`max_rounds=2`。
- 评审来源：**人在环路优先**（插件不持密钥，用户用不同 profile/端点提供评审），自动端点层为后续扩展。
