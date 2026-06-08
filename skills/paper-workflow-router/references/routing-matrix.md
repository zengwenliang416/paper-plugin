# Routing Matrix

Use this matrix to select the minimal Paper Plugin skill set for a request.

## Primary routes

| Trigger signals | Primary skill | Load next |
| --- | --- | --- |
| read paper, summarize PDF, bilingual reader, source anchors, figure anchors | `paper-reader` | `skills/paper-reader/SKILL.md` |
| topic / research question, systematic literature review synthesis, research gap, 选题, 研究空白, 综述梳理 | `paper-research` | `skills/paper-research/SKILL.md` |
| draft, rewrite, opening report, literature review prose, de-AI, polish, quality gate, thesis folder intake, project context, source-of-truth selection, evidence ledger, claim ledger, continue previous thesis | `paper-manuscript-writing` | `skills/paper-manuscript-writing/SKILL.md` |
| DOCX, Word, WPS, page numbers, TOC, three-line tables, formula layout, OOXML, rendered format, final Word delivery | `paper-docx-repair` | `skills/paper-docx-repair/SKILL.md` |
| references, citations, DOI, Crossref, CNKI, GB/T 7714, citation numbering, bibliography authenticity | `paper-literature` | `skills/paper-literature/SKILL.md` |
| figures, screenshots, photos, CAD, DWG, DXF, simulation images, charts, AI image boundary | `paper-figure` | `skills/paper-figure/SKILL.md` |
| data availability, FAIR, repository, accession, identifier, data statement | `paper-data` | `skills/paper-data/SKILL.md` |
| reviewer comments, response letter, rebuttal, editor response, revision package | `paper-response` | `skills/paper-response/SKILL.md` |
| defense PPT, slide outline, talk track, video page, demo script, PPTX handoff | `paper-paper2ppt` | `skills/paper-paper2ppt/SKILL.md` |

## Mixed-lane ordering

When several lanes are present, use this default order:

1. `paper-workflow-router`: classify lanes and out-of-scope parts.
2. `paper-manuscript-writing`: create or update `.paper-context/`, source hierarchy, material registry, version pointers, evidence gaps, and claim ledger.
3. `paper-literature`: verify references before finalizing claims that depend on literature.
4. `paper-figure`: classify visuals and evidence before inserting or replacing images.
5. `paper-docx-repair`: repair or validate the final DOCX after content/evidence changes, including page-PNG render QA before delivery.
6. `paper-paper2ppt`: prepare defense outline, visual map, and demo handoff after thesis content is stable.
7. `paper-data` or `paper-response`: insert when the task explicitly needs data statements or reviewer response.

## Out-of-scope boundary

Default out of scope for Paper Plugin:

- backend/frontend bug fixing
- ports, Docker, MySQL startup, SQL import, deployment, and environment setup
- git branch management and project ZIP packaging
- account, email, Maven, Homebrew, or local tool troubleshooting

Bring these back into scope only when the output directly supports academic evidence, such as screenshots, operation manual text, database schema explanation, reproducible test logs, or final thesis delivery notes.

## Ambiguity rules

- If the user asks "look at this project/folder", start with `paper-manuscript-writing` intake unless the visible artifact is only a DOCX formatting complaint.
- If the user asks to "continue the thesis", "load the project context", "梳理上下文", "先理解论文项目", or similar, start with `paper-manuscript-writing` context intake and report version pointers before drafting.
- If the user asks for final export, archive, or delivery, include context validation and DOCX page-PNG render QA in the lane order when `.paper-context/` exists.
- If the user asks for "format wrong", prefer `paper-docx-repair` when a DOCX exists; prefer `paper-manuscript-writing` export workflow when regenerating from Markdown.
- If the user asks "all references real?" or "citation numbers match?", route to `paper-literature` even if the task also mentions writing.
- If the user asks for "images" but the images are system screenshots, CAD, simulation, or test results, route to `paper-figure` before any generation.
- If the user asks for a real `.pptx`, route to `paper-paper2ppt` for the handoff and then to a presentation-generation capability.
