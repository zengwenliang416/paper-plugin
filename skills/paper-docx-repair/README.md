# Paper DOCX Repair

Repairs and validates existing DOCX thesis, report, and manuscript files without regenerating the whole document.

Primary entry point:

```bash
npx tsx skills/paper-docx-repair/scripts/repair-docx.ts <file.docx> --scan
npx tsx skills/paper-docx-repair/scripts/render-docx.ts <file.docx> --output-dir <render-dir>
```

Use this package for generic Word structure issues such as cross-reference fields, table indentation, TOC levels, update-field settings, OOXML delivery checks, and final DOCX page-PNG render QA.
