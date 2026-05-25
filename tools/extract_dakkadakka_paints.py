from __future__ import annotations

import datetime as dt
import html
import json
import re
import unicodedata
import urllib.request
from collections import Counter
from pathlib import Path

from lxml import etree, html as lxml_html


SOURCE_URL = "https://www.dakkadakka.com/wiki/en/paint_range_compatibility_chart"
OUTPUT_PATH = Path("data/paint-compatibility.json")
README_PATH = Path("data/README.md")

CITATIONS = {
    "1": {
        "label": "discontinued",
        "text": "discontinued",
    },
    "2": {
        "label": "approximate",
        "text": "approximate",
    },
    "3": {
        "label": "Coat D'Arms old Citadel match",
        "text": "Coat D'Arms match the OLD citadel colours (pre-1992) so there might be some difference. Shining gold has the most noticeable difference.",
    },
    "4": {
        "label": "P3 old GW range caveat",
        "text": "Most P3 Paints do not match closely with the old GW range, but a detailed explanation of each paint can be found at the linked Brushthralls article.",
        "url": "http://www.brushthralls.com/pre-painting-prep/color-theory-10p3.html",
    },
    "5": {
        "label": "GW claimed old/new match",
        "text": "GW's new range matches with the old range are the matches claimed by GW. However, many of the paints do not match very closely at all and some mixing will be required to get close to the original colours. If you are trying to match old GW with new GW, you'd be better just getting Vallejo game color or coat d'arms for the closest match.",
    },
    "6": {
        "label": "98-99% masstone match",
        "text": "98-99% colour matches, masstone only.",
    },
    "7": {
        "label": "3rd-5th Edition replica",
        "text": "3rd-5th Edition Replicas, same 98-99% matching criteria, masstone only.",
    },
    "8": {
        "label": "provided conversion chart",
        "text": "According to provided conversion chart.",
    },
    "struckThroughPaintName": {
        "label": "tested non-match",
        "text": "A struck-through paint name indicates that after testing it does not match the GW color and is really far off.",
    },
}


def fetch_source() -> str:
    request = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def clean_whitespace(value: str) -> str:
    value = html.unescape(value).replace("\xa0", " ")
    return re.sub(r"\s+", " ", value).strip()


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = value.lower()
    value = value.replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "unnamed"


def normalize_hex(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip().strip("|").lstrip("#")
    if not value:
        return None
    if value == "0":
        value = "000000"
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    if re.fullmatch(r"[0-9a-fA-F]{6}", value):
        return f"#{value.upper()}"
    return None


def element_text_without_sup_or_struck(element: etree._Element) -> str:
    parts: list[str] = []

    def visit(node: etree._Element) -> None:
        if node.tag in {"sup", "strike", "s", "del"}:
            if node.tail:
                parts.append(node.tail)
            return
        if node.text:
            parts.append(node.text)
        for child in node:
            visit(child)
        if node.tail:
            parts.append(node.tail)

    visit(element)
    return clean_whitespace("".join(parts))


def element_text_all(element: etree._Element) -> str:
    return clean_whitespace("".join(element.itertext()))


def citation_tags(element: etree._Element) -> list[str]:
    tags: list[str] = []
    for sup in element.xpath(".//sup"):
        text = clean_whitespace("".join(sup.itertext()))
        if text.isdigit():
            tags.append(text)
    return sorted(set(tags), key=int)


def struck_texts(element: etree._Element) -> list[str]:
    values: list[str] = []
    for struck in element.xpath(".//strike|.//s|.//del"):
        text = element_text_all(struck)
        if text:
            values.append(text)
    return values


def make_unique_id(prefix: str, parts: list[str], counts: Counter[str]) -> str:
    base = "-".join(slugify(part) for part in parts if part)
    candidate = f"{prefix}-{base}" if base else prefix
    counts[candidate] += 1
    if counts[candidate] == 1:
        return candidate
    return f"{candidate}-{counts[candidate]}"


def find_paint_table(document: etree._Element) -> etree._Element:
    for table in document.xpath("//table"):
        headers = [element_text_all(cell) for cell in table.xpath("./td")]
        if "Hex Code" in headers and "New Citadel 5" in headers:
            return table
    raise RuntimeError("Could not find the paint compatibility table.")


def extract_references(document: etree._Element) -> list[dict[str, str]]:
    references_header = [
        header for header in document.xpath("//h2") if element_text_all(header) == "References"
    ]
    if not references_header:
        return []
    refs: list[dict[str, str]] = []
    for anchor in references_header[0].xpath("./following::a[@href]"):
        href = anchor.get("href")
        text = element_text_all(anchor)
        if not href or text in {"Categories", "Got Comments? Discuss This Page in the Forums. Click Here."}:
            break
        if href.startswith("http"):
            refs.append({"label": text or href, "url": href})
    return refs


def build_dataset(source_html: str) -> dict:
    document = lxml_html.fromstring(source_html)
    table = find_paint_table(document)
    rows = table.xpath("./tr")

    header_cells = table.xpath("./td")
    header_labels = [element_text_without_sup_or_struck(cell) for cell in header_cells]
    header_notes = [citation_tags(cell) for cell in header_cells]
    brand_labels = header_labels[1:-1]

    brands = []
    for index, label in enumerate(brand_labels, start=1):
        brands.append(
            {
                "id": slugify(label),
                "name": label,
                "sourceColumnIndex": index,
                "citationTags": header_notes[index],
            }
        )

    id_counts: Counter[str] = Counter()
    colors: list[dict] = []
    paints: list[dict] = []

    for row_index, row in enumerate(rows, start=1):
        cells = row.xpath("./td")
        if len(cells) != len(header_cells):
            continue

        swatch_hex = normalize_hex(cells[0].get("bgcolor"))
        source_hex_text = element_text_all(cells[-1])
        hex_value = normalize_hex(source_hex_text) or swatch_hex

        paint_cells = cells[1:-1]
        primary_name = next(
            (
                element_text_without_sup_or_struck(cell)
                for cell in paint_cells
                if element_text_without_sup_or_struck(cell)
            ),
            f"row-{row_index}",
        )
        color_id = make_unique_id("color", [primary_name, hex_value or str(row_index)], id_counts)

        color_record = {
            "id": color_id,
            "hex": hex_value,
            "swatchHex": swatch_hex,
            "sourceHex": clean_whitespace(source_hex_text),
            "sourceRowIndex": row_index,
            "paintIds": [],
            "equivalents": {},
        }

        for brand, cell in zip(brands, paint_cells):
            raw_text = element_text_all(cell)
            name = element_text_without_sup_or_struck(cell)
            excluded = struck_texts(cell)

            if not name and not excluded:
                color_record["equivalents"][brand["id"]] = None
                continue

            tags = citation_tags(cell)
            remarks = []
            if excluded:
                remarks.append("Contains struck-through source text; see citation struckThroughPaintName.")

            paint_id = make_unique_id(
                "paint",
                [brand["id"], name or "struck-through-only", hex_value or str(row_index), str(row_index)],
                id_counts,
            )
            paint_record = {
                "id": paint_id,
                "brandId": brand["id"],
                "brandName": brand["name"],
                "name": name,
                "rawText": raw_text,
                "hex": hex_value,
                "swatchHex": swatch_hex,
                "colorId": color_id,
                "sourceRowIndex": row_index,
                "sourceColumnIndex": brand["sourceColumnIndex"],
                "citationTags": tags,
                "excludedNames": excluded,
                "remarks": remarks,
            }
            paints.append(paint_record)
            color_record["paintIds"].append(paint_id)
            color_record["equivalents"][brand["id"]] = paint_id

        colors.append(color_record)

    return {
        "schemaVersion": 1,
        "source": {
            "name": "DakkaDakka Paint Range Compatibility Chart",
            "url": SOURCE_URL,
            "retrievedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        },
        "citations": CITATIONS,
        "brands": brands,
        "colors": colors,
        "paints": paints,
        "references": extract_references(document),
    }


def write_readme(dataset: dict) -> None:
    README_PATH.write_text(
        "\n".join(
            [
                "# Paint Compatibility Data",
                "",
                "Source: https://www.dakkadakka.com/wiki/en/paint_range_compatibility_chart",
                "",
                "Generated by `tools/extract_dakkadakka_paints.py`.",
                "",
                "## Shape",
                "",
                "- `brands`: ordered table columns, with any citation tags attached to the original header.",
                "- `colors`: one record per compatibility row, including the row hex, swatch hex, and brand-to-paint ID map.",
                "- `paints`: flat list of searchable paint entries. Each paint has a stable generated ID, brand, row color hex, citation tags, and source row/column indexes.",
                "- `citations`: definitions for numbered footnotes plus the struck-through paint-name convention.",
                "- `references`: source references listed below the DakkaDakka chart.",
                "",
                f"Extracted rows: {len(dataset['colors'])}",
                f"Extracted paint entries: {len(dataset['paints'])}",
                f"Extracted brands: {len(dataset['brands'])}",
                "",
            ]
        ),
        encoding="utf-8",
    )


def main() -> None:
    source_html = fetch_source()
    dataset = build_dataset(source_html)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(dataset, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_readme(dataset)

    paint_ids = [paint["id"] for paint in dataset["paints"]]
    if len(paint_ids) != len(set(paint_ids)):
        raise RuntimeError("Paint IDs are not unique.")
    color_ids = [color["id"] for color in dataset["colors"]]
    if len(color_ids) != len(set(color_ids)):
        raise RuntimeError("Color IDs are not unique.")

    print(
        json.dumps(
            {
                "output": str(OUTPUT_PATH),
                "rows": len(dataset["colors"]),
                "paints": len(dataset["paints"]),
                "brands": len(dataset["brands"]),
                "references": len(dataset["references"]),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
