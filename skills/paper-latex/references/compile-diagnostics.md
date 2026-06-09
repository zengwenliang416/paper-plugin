# LaTeX Compile Diagnostics

Turn a noisy LaTeX build log into actionable fixes. `scripts/latex-diagnose.ts` **parses** the log; it does not compile (a local TeX install does that).

## Usage

```bash
# capture a log, then diagnose
latexmk -pdf main.tex > build.log 2>&1 || true
npx tsx skills/paper-latex/scripts/latex-diagnose.ts build.log
npx tsx skills/paper-latex/scripts/latex-diagnose.ts build.log --json
```

## What it classifies

| category | trigger | typical fix |
| --- | --- | --- |
| `undefined-command` | Undefined control sequence | check spelling / add the package that defines it |
| `undefined-citation` | Citation `...' undefined | run biber/bibtex; check the citekey |
| `undefined-reference` | Reference `...' undefined | add/fix `\label`; rerun LaTeX twice |
| `missing-file` | File `...' not found / LaTeX Error: File | install the package or fix the path |
| `math-mode` | Missing $ inserted | wrap math in `$…$` or `\(...\)` |
| `runaway` | Runaway argument / Paragraph ended before… | find the unbalanced brace |
| `overfull` | Overfull \hbox (warning) | rephrase or adjust spacing; non-blocking |
| `fatal` | Emergency stop / Fatal error | the build aborted — fix the first real error above it |

## Method

Fix the **first** real error first — later errors are often cascades of it. Re-run the build twice so references and citations settle. `overfull`/`underfull` are warnings, not blockers; do not chase them before the document compiles.
