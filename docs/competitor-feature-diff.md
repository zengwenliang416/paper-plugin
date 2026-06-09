# 竞品特性级 diff（A/B 20 仓）

第二轮"理性全要"的产物。第一轮按**能力簇**吸收(见 `memory/competitor-absorption-roadmap.md`),本轮把 A/B 两档 20 个仓库的**招牌特性逐条**核对到插件的 gate/脚本/reference，补齐"簇收敛"时被平均掉的细粒度缺口。

## 方法与边界

- **竞品基线**：`docs/top-30-competitors.html` 每个仓库的 `features` 字段(一句话描述)。这是**特性宣称**，不是逐仓源码审计——粒度受限于该描述。
- **我方基线**：12 skills / 17 脚本 / 23 个硬 gate / 11 个 validator / 9 个 contract test（截至本轮）。
- 判定：✓ 已覆盖（给出落点）｜✚ 本轮新增｜边界 = 刻意不做。

## 特性级 diff 表

| 竞品招牌特性 | 来源仓(rank) | 插件落点 | 状态 |
|---|---|---|---|
| 多 agent 评审 / cross-model jury | #1 #3 #12 #18 #26 #29 | `paper-review-panel`（model×lens 矩阵 + 加权 + veto） | ✓ |
| N-stage orchestrator | #1 #29 | `paper-workflow-router/lifecycle-state-machine` | ✓ |
| **rebuttal safety gate**（提交前阻断） | #3 | `paper-response/scripts/response-gate.ts` | ✚ G1 |
| multi-index citation verification | #1 #3 #5 #10 #26 | `paper-literature/verify-refs.ts` + `CITATION_NOT_VERIFIED` gate | ✓ |
| **citation locator**（定位到源记录） | #1 | `verify-refs.ts` 的 `locator` 字段（DOI/OpenAlex，仅 verified） | ✚ G2 |
| claim-evidence alignment / audit | #6 #18 | `validateClaimEvidence` gate + `thesis-claim-audit.md` | ✓ |
| reviewer-mindset self-review | #6 #18 | `paper-review-panel/review-lenses` + `paper-review.md` | ✓ |
| 选题 Socratic / FINER / PICO | #1 #14 | `paper-research/topic-socratic.md` | ✓ |
| 系统综述 PRISMA-lite | #1 | `paper-research/systematic-review.md` + `review-outline.ts` | ✓ |
| gap analysis | #18 | `paper-research/gap-analysis.md` | ✓ |
| 多渠道/多层级文献检索（"8 方案"） | #14 | `paper-literature/search-strategy.md`（precise/synonym/broad 三级） | ✓ |
| Zotero 集成 | #5 #8 #11 #13 #16 #28 | `paper-literature/zotero-workflow.md` | ✓ |
| Obsidian 集成 / literature notes | #5 #8 #11 #13 #16 | `paper-literature/obsidian-workflow.md` | ✓ |
| 布局保留 PDF 翻译 | #27 | `paper-reader/pdf-ingest.md`（挂接 PDFMathTranslate，不重造引擎） | ✓ |
| LaTeX 导出 | #1 #5 #20 #26 | `paper-latex/latex-export.md` | ✓ |
| vision-in-the-loop LaTeX 排版 | #23 | `paper-latex/render-latex.ts` + `render-qa.md` | ✓ |
| 编译诊断 / fix errors / polish | #25 | `paper-latex/latex-diagnose.ts` + `compile-diagnostics.md` | ✓ |
| venue 模板（NeurIPS 等）/ journal convention | #18 #20 #25 | `paper-latex/venue-templates.md` + `parse-template.ts` | ✓ |
| Overleaf sync | #3 #12 | `paper-latex/overleaf-workflow.md` | ✓ |
| Material Passport（材料身份/来源/信任） | #1 | `.paper-context/registry/sources.json` + `material-passport.md`（映射） | ✓ |
| Research Wiki（跨会话研究记忆） | #3 | `.paper-context`（snapshots/ledgers）+ `research-wiki.md`（映射） | ✓ |
| anti-AI / de-AI style | #22 #24 | `academic-humanizer-zh.md` + `aigc-report-rewrite.md` + `style-guardrails.md` | ✓ |
| nature-style writing | #5 | `published-article-patterns.md` + `style-guardrails.md` | ✓ |
| publication-readiness 检查 | #12 | `review-lenses` + `undergraduate-quality-gate.md` + context gates（聚合） | ✓ G3 |
| 20k+ word 长稿 / 章节体系 | #26 | `paper-manuscript-writing` 章节 references | ✓ |
| 投稿回复 / rebuttal | #14 | `paper-response`（+ G1 gate） | ✓ |
| slides / 答辩 | #24 | `paper-paper2ppt` | ✓ |
| 实验自动化 / experiment queue | #3 #22 | `experiment-records.md`（复现*记录*薄约定） | 边界（不做平台） |
| grants 基金申请 | #14 | — | 边界（G6：范围外，已在 `research-workflow.md` 声明） |
| standalone App / browser UI | #9 #22 | — | 形态不收（插件 ≠ 独立产品） |

**结论**：A/B 20 仓的招牌特性中，真缺口只有 2 个（rebuttal safety gate、citation locator），本轮均已补为硬约束/脚本增量；其余经逐条核实均已有落点。

## 本轮新增（真缺口闭合）

- **G1 — rebuttal safety gate**：`paper-response` 此前是唯一一个有"gate"语义却纯靠自觉的 skill（`qa-checklist.md` 文字约束、零脚本）。新增 `scripts/response-gate.ts`：把 response tracker 确定性裁定为 `ready_to_submit / draft_with_placeholders / needs_author_input / blocked`，**声明的 readiness 只能被证据下调、不能上调**，缺定位/未答/不可追溯/blocking 项无法标 ready；非 ready 即非零退出。12-case contract 挂进 `npm run validate`。
- **G2 — citation locator**：`verify-refs.ts` 把每条匹配记录的可解析 locator（DOI URL / OpenAlex id）透传到 JSON/TSV，**仅对 verified 给出**——flagged 引用不会被塞一个误导性的"来源"链接。粒度是"bib 条目 → 权威记录"；claim 级 grounding 仍由 `validateClaimEvidence` + `paper-reader` 承担（与 Imbad 全文行级 locator 的差异已如实标注）。

## C 档差异确认（模板/prompt 库，维持跳过）

#4 ahmetbersoz、#6 Master-cai、#24 alfonso0512 = 写作模板/prompt 库。逐项核对 `paper-manuscript-writing` 的 references：章节模板（abstract/introduction/method/conclusion/related-work/article-architecture）、phrasebank、claim-evidence（`thesis-claim-audit` 对应 #6 招牌）、reviewer self-review（`paper-review`）、de-AI（`academic-humanizer-zh`）、降重（`plagiarism-strategy`）**均已覆盖**。无新增可吸收的能力簇，维持跳过——再吸收即重复造轮子。

## D 档延伸阅读（链接登记，不搬内容）

情报源 / 广库 / 独立 App / 特化 / awesome-list / 重复，**不融入 skill**，仅登记备查：

- [#2 alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) — 338+ 广库（会稀释聚焦）
- [#7 Imbad0202/academic-research-skills-codex](https://github.com/Imbad0202/academic-research-skills-codex) — #1 的 Codex 版（重复）
- [#9 Future-Scholars/paperlib](https://github.com/Future-Scholars/paperlib) — 独立 paper 管理 App（另一种产品形态）
- [#15 aipoch/medical-research-skills](https://github.com/aipoch/medical-research-skills) — 医学特化（偏离）
- [#17 writing-resources/awesome-scientific-writing](https://github.com/writing-resources/awesome-scientific-writing) — awesome-list（链接集）
- [#21 awesome-thesis/awesome-thesis](https://github.com/awesome-thesis/awesome-thesis) — awesome-list（链接集）
- [#30 emptymalei/awesome-research](https://github.com/emptymalei/awesome-research) — awesome-list（链接集）
