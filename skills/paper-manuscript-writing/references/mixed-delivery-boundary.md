# Mixed Thesis And Project Delivery Boundary

Use this when a graduation-thesis folder also contains source code, database files, screenshots, videos, deployment notes, or a final delivery package.

## Route the task first

Separate the request into one of these lanes:

| Lane | In paper-plugin scope |
| --- | --- |
| thesis content | yes: write, revise, cite, evidence-check, and export thesis material |
| thesis evidence from code | yes: read code/data/screenshots to support manuscript claims |
| DOCX repair | yes: repair or validate the delivered Word file |
| defense material | yes: produce outline, prompt, visual map, and talk track |
| software repair | no: backend/frontend bug fixing, ports, Docker, MySQL, login, order flow |
| project packaging | no by default: ZIP creation, git cleanup, deployment packaging, runtime setup |

If the user asks for both thesis and project delivery, split the plan and name which lane each action belongs to.

## Evidence use from software projects

Source code may support thesis writing only when it is converted into evidence:

- module description from real files
- database table explanation from schema or migrations
- process flow from routes, services, workflows, or logs
- screenshots from actual running UI
- test descriptions from real commands, outputs, or manual test notes

Do not describe features, tests, or performance that the codebase does not show.

## Delivery split

For mixed graduation deliveries, prefer separate folders:

- `01_论文/`: final DOCX/PDF, citation notes, format report, AIGC/check notes if requested
- `02_项目源码/`: source code, SQL/migrations, README, operation manual, test evidence, screenshots
- `03_答辩材料/`: defense outline, deck prompt/PPTX, talk track, video script, visual map

## Default exclusions

Exclude from project packages unless the user explicitly asks:

- `.git/`, `.agent/`, `openspec/runtime/`, `node_modules/`, `dist/`, `target/`
- runtime database directories, Docker runtime state, local caches, `.DS_Store`, `*.log`
- real `.env`, credentials, personal tokens, and machine-specific paths
- Word lock files such as `~$*`

Exclude from thesis packages unless version history is required:

- `*.bak*`, `*.raw.docx`, `*.pass1.docx`, `*.pass1.pdf`
- debug directories, temporary extracted DOCX packages, temporary rendered PDFs
- old drafts that are not the selected final source

## Final report

End with separate status lines:

- thesis content status
- thesis evidence status
- DOCX/PDF format status
- project package status
- remaining TODOs or explicitly out-of-scope software tasks

