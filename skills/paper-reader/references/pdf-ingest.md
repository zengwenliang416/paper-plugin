# PDF Ingestion (extraction & layout-preserving translation)

`paper-reader` works on *extracted* paper text. This note covers getting that text out of a PDF — including layout-preserving translation — before grounding. The plugin **does not bundle a PDF engine**; it consumes extracted text or an external tool's / MCP's output.

## Extraction

- **Text PDF**: extract text + figure positions with the host's PDF tools or a PDF MCP. Keep page/section structure so anchors stay stable.
- **Scanned PDF**: OCR first; flag low-confidence pages for manual review rather than trusting them silently.

## Layout-preserving translation (optional)

- For a bilingual reading artifact of a foreign-language PDF, a tool like **PDFMathTranslate** (preserves formulas / figures / TOC, has an MCP) can produce a translated PDF while keeping layout.
- Feed its extracted text/translation into `paper-reader`'s grounding step. **Do not let machine translation replace source grounding** — anchors must still tie to the original source blocks, and the translation is verified against them.

## Boundary

- External tools provide extraction/translation; `paper-reader` provides the source-grounded artifact.
- After ingestion, hand off to `references/grounding-rules.md` and `references/output-spec.md`.
