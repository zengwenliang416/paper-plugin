# AIGC Report Rewrite

Use this when the user provides an AIGC, duplicate-check, plagiarism, or "AI taste" report and asks for lowering, humanizing, polishing, or academic rewriting.

## Report is not the source

Treat the report as a locator only. Do not rewrite the report text itself.

1. Identify report hits: page, paragraph, sentence, percentage, color block, or quoted text.
2. Map each hit back to the editable source: DOCX paragraph, Markdown paragraph, or extracted text block.
3. Preserve a before/after record for every rewritten passage.
4. Export or repair the real deliverable after source edits.

If the source paragraph cannot be found, mark it as unmapped and ask for the correct source file instead of guessing.

## Protected content

Lock these before rewriting:

- formulas, formula numbers, figure/table numbers, and section numbers
- citation numbers and bibliography entries
- technical terms, model names, class/function names, device names, and database table names
- data values, units, metrics, thresholds, dates, and sample sizes
- teacher-required wording, school template labels, and required headings

After rewriting, diff the protected content. Any accidental change must be reverted or justified.

## Good rewrite actions

- Replace template prose with project facts, evidence, design decisions, experiment conditions, and result boundaries.
- Split long mechanical sentences into natural academic prose without becoming conversational.
- Combine repeated generic claims with concrete local materials.
- Add source-grounded context before a claim instead of adding filler words.
- Keep voice formal: use `本文`, `本研究`, `系统`, `实验结果`, and `仿真结果` when supported.

## Bad rewrite actions

- Do not pad with `的`, `了`, `在一定程度上`, `可以说`, or chatty transition words.
- Do not change numbers, citations, labels, or formulas to make text look different.
- Do not introduce new experiments, deployment results, screenshots, or references.
- Do not promise a final platform percentage unless the same platform was rechecked.

## Output artifacts

For multi-paragraph work, leave a compact audit trail:

- `before.md` or extracted before text
- `after.md` or rewritten source text
- `rewrite-log.tsv` with paragraph id, issue, action, and protected-content status
- `diff.html` or text diff when practical
- `output.docx` when the deliverable is Word
- `validation.md` noting source mapping, protected-content checks, and remaining unmapped hits

