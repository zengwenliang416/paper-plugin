# Paper DOCX Repair

Repairs and validates existing DOCX thesis, report, and manuscript files without regenerating the whole document.

Primary entry point:

```bash
npx tsx skills/paper-docx-repair/scripts/repair-docx.ts <file.docx> --scan
```

Use this package for generic Word structure issues such as cross-reference fields, table indentation, TOC levels, update-field settings, and OOXML delivery checks.
