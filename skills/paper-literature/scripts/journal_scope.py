from __future__ import annotations

import re


FAMILY_NATURE = "Nature Portfolio"
FAMILY_SCIENCE = "Science family"
FAMILY_CELL = "Cell Press"

FLAGSHIP = {"Nature", "Science", "Cell"}

SCIENCE_EXACT = {
    "Science",
    "Science Advances",
    "Science Immunology",
    "Science Robotics",
    "Science Signaling",
    "Science Translational Medicine",
}

CELL_EXACT = {
    "Cell",
    "Cancer Cell",
    "Cell Chemical Biology",
    "Cell Genomics",
    "Cell Host & Microbe",
    "Cell Metabolism",
    "Cell Reports",
    "Cell Reports Medicine",
    "Cell Reports Methods",
    "Cell Reports Physical Science",
    "Cell Stem Cell",
    "Cell Systems",
    "Chem",
    "Current Biology",
    "Developmental Cell",
    "Immunity",
    "Joule",
    "Med",
    "Molecular Cell",
    "Neuron",
    "One Earth",
    "Patterns",
    "Structure",
    "The Innovation",
}


def normalize_title(title: str) -> str:
    return re.sub(r"\s+", " ", title or "").strip()


def is_nature_portfolio(journal: str) -> bool:
    journal = normalize_title(journal)
    if not journal:
        return False
    return (
        journal == "Nature"
        or journal == "Scientific Reports"
        or journal.startswith("Nature ")
        or journal.startswith("Communications ")
        or journal.startswith("npj ")
    )


def is_science_family(journal: str) -> bool:
    return normalize_title(journal) in SCIENCE_EXACT


def is_cell_press(journal: str) -> bool:
    journal = normalize_title(journal)
    if not journal:
        return False
    return journal in CELL_EXACT or journal.startswith("Trends in ")


def journal_family(journal: str) -> str | None:
    journal = normalize_title(journal)
    if not journal:
        return None
    if is_nature_portfolio(journal):
        return FAMILY_NATURE
    if is_science_family(journal):
        return FAMILY_SCIENCE
    if is_cell_press(journal):
        return FAMILY_CELL
    return None


def in_scope(journal: str, scope: str) -> bool:
    journal = normalize_title(journal)
    if not journal:
        return False
    if scope == "flagship":
        return journal in FLAGSHIP
    family = journal_family(journal)
    if scope == "nature":
        return family == FAMILY_NATURE
    if scope == "science":
        return family == FAMILY_SCIENCE
    if scope == "cell":
        return family == FAMILY_CELL
    return family in {FAMILY_NATURE, FAMILY_SCIENCE, FAMILY_CELL}
