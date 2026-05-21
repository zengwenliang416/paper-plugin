# Thesis Claim Audit

Use this before strengthening conclusions, expanding thin chapters, lowering AIGC risk, or marking a thesis as complete. The goal is to separate supported claims from unsupported prose.

## Trigger phrases

Run a claim audit when the manuscript contains or the user asks about:

- `实验结果表明`, `验证了`, `显著提升`, `稳定运行`, `实测`, `真实`, `优化后`, `准确率`, `通过测试`
- result, comparison, simulation, operation, deployment, dataset, model, hardware, or system-performance claims
- teacher feedback that says content is empty, evidence is weak, screenshots are missing, or conclusions are unsupported

## Claim ledger

Create a ledger before editing high-risk claims.

| Field | Required content |
| --- | --- |
| chapter/section | location of the claim |
| claim text | exact sentence or compact paraphrase |
| evidence type | code, screenshot, log, raw data, model file, calculation, drawing, reference, teacher comment |
| source path | local file path, command, or document page that supports the claim |
| verification action | command run, rendered page checked, file inspected, or source cross-checked |
| status | verified, partial, missing, contradictory, or out of scope |
| edit action | keep, rewrite, soften, delete, or mark TODO |

## Evidence standards

- Code and UI claims need source files, screenshots, test notes, route/API behavior, database state, or operation logs.
- Experiment claims need raw data, scripts, metric definitions, plots, seeds/configs, or reproducible logs.
- Simulation claims need model/source files, parameters, screenshots, exported results, and a clear boundary between simulation and real deployment.
- CAD/drawing claims need source drawings, exported views, calculation sheets, or school/industry drawing requirements.
- Literature claims need a verified reference and a concrete citation placement.

## Rewrite rules

- If evidence is verified, keep the claim but make the wording match the actual scope.
- If evidence is partial, soften the claim and name the limitation.
- If evidence is missing, mark `[TODO: 需补充证据]` or remove the claim from the final deliverable.
- If evidence contradicts the claim, rewrite the paragraph before polishing style.
- Do not use AI-generated images, placeholder charts, or generic prose as proof of experiments, tests, screenshots, or real operation.

## Final status

Report these statuses separately:

- `content_complete`: chapters have readable thesis prose
- `evidence_verified`: high-risk claims have supporting sources
- `format_verified`: DOCX/PDF layout checks passed
- `todo_remaining`: missing evidence, missing assets, or unverified claims still exist

