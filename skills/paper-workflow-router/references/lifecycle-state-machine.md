# Project Lifecycle State Machine

Use this lifecycle summary when routing project-level paper or thesis tasks.
The lifecycle state describes the project as a whole; it is separate from the
semantic version status in `.paper-context/versions.yaml`.

```text
UNINITIALIZED
 -> INITIALIZED
 -> MATERIALS_INVENTORIED
 -> SCOPE_LOCKED
 -> STRUCTURE_PLANNED
 -> SECTION_DRAFTING
 -> EVIDENCE_RECONCILING
 -> REFERENCES_READY
 -> VISUALS_READY
 -> DATA_READY
 -> EXPORT_CANDIDATE
 -> DOCX_VERIFIED
 -> DEFENSE_READY / SUBMISSION_READY
 -> RESPONSE_REVISION
 -> FINAL_DELIVERED
 -> ARCHIVED
```

## Blocking transition rules

- Do not enter `SCOPE_LOCKED` while title, task book, teacher comments, and
  selected editable source conflict.
- Do not enter `SECTION_DRAFTING` without an outline and required evidence map.
- Do not enter `EXPORT_CANDIDATE` when high-risk claims lack a claim ledger.
- Do not enter `DOCX_VERIFIED` from XML-only checks; require rendered preview,
  PDF conversion, or manual visible-page evidence.
- Do not enter `DEFENSE_READY` while core visuals are placeholders.
- Do not enter `ARCHIVED` without final outputs, checksums, validation report,
  version checkpoint, and known limitations.

## Router use

The router should report lifecycle state and next allowed state when available,
then route execution to the smallest skill set that can advance the project.
