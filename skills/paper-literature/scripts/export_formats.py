from __future__ import annotations

import re
from pathlib import Path
from typing import Protocol
from xml.sax.saxutils import escape as xml_escape
from xml.sax.saxutils import quoteattr


EXPORT_FORMAT_CHOICES = ("enw", "ris", "zotero-rdf", "rdf")
DEFAULT_EXPORT_FORMAT = "enw"
ZOTERO_RDF_NS = {
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "z": "http://www.zotero.org/namespaces/export#",
    "dcterms": "http://purl.org/dc/terms/",
    "bib": "http://purl.org/net/biblio#",
    "foaf": "http://xmlns.com/foaf/0.1/",
    "dc": "http://purl.org/dc/elements/1.1/",
    "prism": "http://prismstandard.org/namespaces/1.2/basic/",
}


class ExportCandidate(Protocol):
    title: str
    journal: str
    year: str
    y1: str
    doi: str
    doi_url: str
    volume: str
    issue: str
    start_page: str
    end_page: str
    issn: str
    authors: list[str]
    article_resource: str
    journal_resource: str
    zotero_citation_key: str
    identifier_url: str
    page_range: str


def normalize_export_format(value: str | None) -> str:
    if not value:
        return DEFAULT_EXPORT_FORMAT
    if value == "rdf":
        return "zotero-rdf"
    return value


def infer_export_format(output_path: Path | None) -> str:
    if output_path is None:
        return DEFAULT_EXPORT_FORMAT
    suffix = output_path.suffix.lower()
    if suffix == ".ris":
        return "ris"
    if suffix == ".rdf":
        return "zotero-rdf"
    if suffix == ".enw":
        return "enw"
    return DEFAULT_EXPORT_FORMAT


def export_filename(export_format: str, base: str = "references") -> str:
    if export_format == "ris":
        return f"{base}.ris"
    if export_format == "zotero-rdf":
        return f"{base}.rdf"
    return f"{base}.enw"


def export_label(export_format: str) -> str:
    if export_format == "ris":
        return "RIS"
    if export_format == "zotero-rdf":
        return "Zotero RDF"
    return "ENW"


def ris_escape(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def zotero_date_value(item: ExportCandidate) -> str:
    if item.y1:
        return item.y1.replace("/", "-")
    return item.year


def split_author_parts(name: str) -> tuple[str, str]:
    if "," in name:
        family, given = name.split(",", 1)
        return family.strip(), given.strip()
    parts = [part for part in name.split() if part]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[-1], " ".join(parts[:-1])


def build_ris_record(item: ExportCandidate) -> str:
    lines: list[str] = []
    lines.append("TY  - JOUR")
    if item.title:
        lines.append(f"TI  - {ris_escape(item.title)}")
    for author in item.authors:
        lines.append(f"AU  - {ris_escape(author)}")
    if item.journal:
        lines.append(f"T2  - {ris_escape(item.journal)}")
        lines.append(f"JO  - {ris_escape(item.journal)}")
    if item.year:
        lines.append(f"PY  - {ris_escape(item.year)}")
    if item.y1:
        lines.append(f"Y1  - {ris_escape(item.y1)}")
    if item.volume:
        lines.append(f"VL  - {ris_escape(item.volume)}")
    if item.issue:
        lines.append(f"IS  - {ris_escape(item.issue)}")
    if item.start_page:
        lines.append(f"SP  - {ris_escape(item.start_page)}")
    if item.end_page:
        lines.append(f"EP  - {ris_escape(item.end_page)}")
    if item.doi:
        lines.append(f"DO  - {ris_escape(item.doi)}")
    if item.doi_url:
        lines.append(f"UR  - {ris_escape(item.doi_url)}")
    if item.issn:
        lines.append(f"SN  - {ris_escape(item.issn)}")
    lines.append("N1  - Metadata-only candidate. Inspect abstract or publisher page before citing as support.")
    lines.append("ER  -")
    return "\n".join(lines)


def write_ris(candidates: list[ExportCandidate], path: Path) -> None:
    lines: list[str] = []
    for item in candidates:
        lines.append(build_ris_record(item))
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def build_enw_record(item: ExportCandidate) -> str:
    lines: list[str] = []
    lines.append("%0 Journal Article")
    if item.title:
        lines.append(f"%T {ris_escape(item.title)}")
    for author in item.authors:
        lines.append(f"%A {ris_escape(author)}")
    if item.journal:
        lines.append(f"%J {ris_escape(item.journal)}")
    if item.volume:
        lines.append(f"%V {ris_escape(item.volume)}")
    if item.issue:
        lines.append(f"%N {ris_escape(item.issue)}")
    if item.start_page and item.end_page:
        lines.append(f"%P {ris_escape(item.start_page)}-{ris_escape(item.end_page)}")
    elif item.start_page:
        lines.append(f"%P {ris_escape(item.start_page)}")
    if item.year:
        lines.append(f"%D {ris_escape(item.year)}")
    if item.issn:
        lines.append(f"%@ {ris_escape(item.issn)}")
    if item.doi:
        lines.append(f"%R {ris_escape(item.doi)}")
    if item.doi_url:
        lines.append(f"%U {ris_escape(item.doi_url)}")
    return "\n".join(lines)


def write_enw(candidates: list[ExportCandidate], path: Path) -> None:
    lines: list[str] = []
    for item in candidates:
        lines.append(build_enw_record(item))
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def build_zotero_rdf_article(item: ExportCandidate) -> str:
    lines: list[str] = [f'    <bib:Article rdf:about={quoteattr(item.article_resource)}>']
    lines.append("        <z:itemType>journalArticle</z:itemType>")
    if item.journal:
        lines.append(f'        <dcterms:isPartOf rdf:resource={quoteattr(item.journal_resource)}/>')
    if item.authors:
        lines.append("        <bib:authors>")
        lines.append("            <rdf:Seq>")
        for author in item.authors:
            family, given = split_author_parts(author)
            lines.append("                <rdf:li>")
            lines.append("                    <foaf:Person>")
            if family:
                lines.append(f"                        <foaf:surname>{xml_escape(family)}</foaf:surname>")
            if given:
                lines.append(f"                        <foaf:givenName>{xml_escape(given)}</foaf:givenName>")
            lines.append("                    </foaf:Person>")
            lines.append("                </rdf:li>")
        lines.append("            </rdf:Seq>")
        lines.append("        </bib:authors>")
    if item.title:
        lines.append(f"        <dc:title>{xml_escape(item.title)}</dc:title>")
    date_value = zotero_date_value(item)
    if date_value:
        lines.append(f"        <dc:date>{xml_escape(date_value)}</dc:date>")
    lines.append("        <z:libraryCatalog>Crossref</z:libraryCatalog>")
    if item.identifier_url:
        lines.append("        <dc:identifier>")
        lines.append("            <dcterms:URI>")
        lines.append(f"                <rdf:value>{xml_escape(item.identifier_url)}</rdf:value>")
        lines.append("            </dcterms:URI>")
        lines.append("        </dc:identifier>")
    if item.doi:
        lines.append(f"        <dc:identifier>{xml_escape(f'DOI {item.doi}')}</dc:identifier>")
    if item.page_range:
        lines.append(f"        <bib:pages>{xml_escape(item.page_range)}</bib:pages>")
    lines.append(f"        <z:citationKey>{xml_escape(item.zotero_citation_key)}</z:citationKey>")
    lines.append("    </bib:Article>")
    return "\n".join(lines)


def build_zotero_rdf_journal(item: ExportCandidate) -> str:
    lines: list[str] = [f'    <bib:Journal rdf:about={quoteattr(item.journal_resource)}>']
    if item.volume:
        lines.append(f"        <prism:volume>{xml_escape(item.volume)}</prism:volume>")
    if item.journal:
        lines.append(f"        <dc:title>{xml_escape(item.journal)}</dc:title>")
    if item.issue:
        lines.append(f"        <prism:number>{xml_escape(item.issue)}</prism:number>")
    if item.issn:
        lines.append(f"        <dc:identifier>{xml_escape(f'ISSN {item.issn}')}</dc:identifier>")
    lines.append("    </bib:Journal>")
    return "\n".join(lines)


def build_zotero_rdf_document(candidates: list[ExportCandidate]) -> str:
    root_open = [
        "<rdf:RDF",
        *(f' xmlns:{prefix}="{uri}"' for prefix, uri in ZOTERO_RDF_NS.items()),
        ">",
    ]
    journal_map: dict[str, str] = {}
    article_blocks: list[str] = []
    for item in candidates:
        article_blocks.append(build_zotero_rdf_article(item))
        if item.journal and item.journal_resource not in journal_map:
            journal_map[item.journal_resource] = build_zotero_rdf_journal(item)
    sections = ["".join(root_open), *article_blocks, *journal_map.values(), "</rdf:RDF>"]
    return "\n".join(section for section in sections if section)


def write_zotero_rdf(candidates: list[ExportCandidate], path: Path) -> None:
    path.write_text(build_zotero_rdf_document(candidates), encoding="utf-8")


def write_export(candidates: list[ExportCandidate], path: Path, export_format: str) -> None:
    if export_format == "ris":
        write_ris(candidates, path)
        return
    if export_format == "zotero-rdf":
        write_zotero_rdf(candidates, path)
        return
    if export_format == "enw":
        write_enw(candidates, path)
        return
    raise ValueError(f"Unsupported export format: {export_format}")
