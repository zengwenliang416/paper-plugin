# figures4papers Archive Index

Use this file when a user asks for a `figures4papers` look, cites the older
`scientific-figure-making` lineage, or needs a concrete Python/matplotlib
starting point in addition to the package rules.

The bundled materials under `../assets/figures4papers/` are archival inspiration
snapshots, not canonical paper-figure examples. Treat the scripts as historical
patterns that must be adapted to the current package rules before reuse.

Current source of truth:

- [design-theory.md](design-theory.md) — typography, palette, composition, and journal-facing rationale
- [figure-contract.md](figure-contract.md) — claim-first planning contract and panel logic
- [thesis-chart-table-rules.md](thesis-chart-table-rules.md) — thesis/table/caption guardrails
- [qa-contract.md](qa-contract.md) — delivery-time export and integrity checks

## How to use the demos

1. Start with the current paper-figure rules listed above; do not begin from a demo script.
2. Select the closest chart family from the table below.
3. Read the listed `plot_*.py` files for layout and encoding ideas only.
4. Rebuild fonts, export settings, dimensions, captions, and labels to satisfy the
   current package rules and the target paper/thesis context.
5. Reuse the pattern, not the demo data, manuscript-specific labels, or raw export setup.
6. Do not reveal local repository paths or internal asset filenames in user-facing
   prose unless the user asks for an audit trail.

## Bundled project map

| Project | Open when | Archived materials |
|---------|-----------|----------------|
| `figure_ImmunoStruct` | Method comparison bars, ablation bars, large readable annotations | `../assets/figures4papers/figure_ImmunoStruct/plot_bars.py`, `raw_data.py` |
| `figure_CellSpliceNet` | Compact comparison and ablation bars | `../assets/figures4papers/figure_CellSpliceNet/plot_comparison.py`, `plot_ablation.py` |
| `figure_brainteaser` | Composition breakdown bars, category/subcategory comparisons, rewriting/self-correction panels | `../assets/figures4papers/figure_brainteaser/plot_*.py` |
| `figure_VIGIL` | Radar/polar comparison and post-training trend lines | `../assets/figures4papers/figure_VIGIL/plot_comparison_radar.py`, `plot_posttraining.py` |
| `figure_ophthal_review` | Time trends and composition heatmaps for review/survey style figures | `../assets/figures4papers/figure_ophthal_review/plot_trend.py`, `plot_composition.py` |
| `figure_RNAGenScape` | Heatmaps, optimization/speed comparisons, manifold illustrations, sweep plots | `../assets/figures4papers/figure_RNAGenScape/plot_*.py` |
| `figure_Dispersion` | Conceptual 3D-style sphere diagrams and observation/idea panels | `../assets/figures4papers/figure_Dispersion/plot_illustration.py`, `plot_idea.py` |
| `figure_Cflows` | Diffusion/trajectory illustrations, gene-regulatory comparisons, ablation comparisons | `../assets/figures4papers/figure_Cflows/*.py` |
| `figure_FPGM` | Frequency-prior or distribution-style method motivation figure | `../assets/figures4papers/figure_FPGM/plot_freq_prior.py` |
| `assets` | Partially manual schematic/result panels for visual inspiration only | `../assets/figures4papers/assets/*.png` |

## Pattern routing

- Grouped bars: start with `figure_ImmunoStruct`, `figure_CellSpliceNet`, or
  `figure_brainteaser`; then rebuild with the current paper-figure contract,
  font rules, and export requirements.
- Radar/polar: start with `figure_VIGIL`; cross-check `chart-types.md` before
  implementing normalization, radial labels, and legend placement.
- Trend/line: start with `figure_VIGIL` or `figure_ophthal_review`; use shared
  legends and direct event labels where they reduce eye travel.
- Heatmap/matrix: start with `figure_RNAGenScape` or `figure_ophthal_review`; keep
  colorbars and labels readable at final journal dimensions.
- Conceptual 3D/spheres: start with `figure_Dispersion` or `figure_Cflows`; use this
  only when it supports the manuscript claim, not as decorative filler.

## Relationship to the older skill

The original `scientific-figure-making` skill focused on publication-ready
matplotlib figures and the figures4papers house style. In this repository, that
history is preserved as archive material inside paper-figure rather than as the
canonical compliance layer:

- `design-theory.md`, `figure-contract.md`, and `thesis-chart-table-rules.md`
  are the rule-set entry points to consult first.
- `api.md` contains helper signatures and export conventions to apply after the
  figure contract is set.
- `common-patterns.md`, `chart-types.md`, and `tutorials.md` provide reusable
  scaffolds that still need project-specific adaptation.
- This file preserves the archived demo script map and bundled inspiration assets.

## External source

Original upstream repository:
<https://github.com/ChenLiu-1996/figures4papers>
