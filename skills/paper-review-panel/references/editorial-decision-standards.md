# Editorial Decision Standards

Maps the panel's `pass / revise / block` verdict onto the four editorial categories
reviewers and editors actually use, so a GateDecision can be read as an editorial
decision. Borrowed from the editorial-decision model in
`Imbad0202/academic-research-skills-codex` (academic-research-suite), adapted to
this plugin's **veto + weight** aggregate rather than its score-average.

## Verdict → editorial decision

| GateDecision `result` | Editorial decision | Meaning |
|---|---|---|
| `pass` | **Accept / Minor Revision** | fundamentally sound; at most limited, non-structural fixes |
| `revise` | **Major Revision** | sound core, but real issues need a revision + re-review |
| `block` (no veto) | **Major Revision (blocking)** | a serious issue must be resolved before reconsideration |
| `block` (veto) | **Reject (as submitted)** | an integrity/citation veto failed; not reconsiderable until resolved |
| `error` | no decision | an endpoint failed; fix infrastructure, do not read as a verdict |

## Optional: escalate to score-based standards

The pass/revise/block model is the lightweight default. For a formal editorial panel
that needs explicit thresholds (the codex model), add per-dimension 1–5 scores and
decide by:

- **Accept** — average ≥ 4.0, no dimension < 3.0, ≥ 3/4 reviewers Accept/Minor.
- **Minor Revision** — average ≥ 3.5, no dimension < 2.5, fixable in one pass.
- **Major Revision** — substantive issues, but the core contribution survives.
- **Reject** — a fatal flaw, or core claims unsupported.

Scoring would change `aggregate()` (today veto + weight, not score-average), so it is
an **opt-in heavier mode**, not the default. The veto rule (a citation/integrity
`block` is non-negotiable) holds under either model.

## Use with the adversarial lens

Run the `adversarial` lens (`review-lenses/adversarial.md`) to surface reject reasons
*before* submission; its `打回` maps to **Reject** above. A package that survives the
devil's advocate sits closer to Accept than one only checked by balanced lenses.
