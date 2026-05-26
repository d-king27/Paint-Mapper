export const ALL_BRANDS = "all";
export const MAX_RESULTS = 80;
export const DEFAULT_HIDDEN_TAGS = [];

export function getNoteTitle(citations, tag) {
  const citation = citations[tag];
  return citation ? `${citation.label}: ${citation.text}` : `Note ${tag}`;
}

export function getNoteLabel(citations, tag) {
  return citations[tag]?.label || `Note ${tag}`;
}

export function getPaintTags(paint) {
  return [...paint.citationTags, ...(paint.excludedNames.length ? ["struckThroughPaintName"] : [])];
}

export function getAvailableTags(data) {
  const usedTags = new Set();
  data.paints.forEach((paint) => {
    getPaintTags(paint).forEach((tag) => usedTags.add(tag));
  });

  return Object.keys(data.citations)
    .filter((tag) => usedTags.has(tag))
    .sort((a, b) => {
      if (a === "struckThroughPaintName") return 1;
      if (b === "struckThroughPaintName") return -1;
      return Number(a) - Number(b);
    });
}

export function paintSearchText(paint, citations) {
  const notes = paint.citationTags.map((tag) => getNoteTitle(citations, tag)).join(" ");
  return [
    paint.name,
    paint.rawText,
    paint.brandName,
    paint.hex,
    notes,
    paint.excludedNames.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function scorePaint(paint, query, citations) {
  if (!query) return 1;

  const name = paint.name.toLowerCase();
  const brand = paint.brandName.toLowerCase();
  const raw = paint.rawText.toLowerCase();
  const hex = paint.hex.toLowerCase();

  if (name === query) return 100;
  if (`${brand} ${name}` === query) return 95;
  if (name.startsWith(query)) return 80;
  if (raw.startsWith(query)) return 75;
  if (brand.includes(query) && name.includes(query)) return 65;
  if (name.includes(query)) return 60;
  if (brand.includes(query)) return 42;
  if (hex.includes(query.replace("#", "")) || hex.includes(query)) return 38;
  if (paintSearchText(paint, citations).includes(query)) return 25;

  return 0;
}

export function filterPaints(data, { query = "", ownedBrand = ALL_BRANDS, hiddenTags = [], maxResults = MAX_RESULTS } = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const hiddenTagSet = new Set(hiddenTags);
  let paints = data.paints.filter((paint) => paint.name);

  if (ownedBrand !== ALL_BRANDS) {
    paints = paints.filter((paint) => paint.brandId === ownedBrand);
  }

  paints = paints.filter((paint) => !getPaintTags(paint).some((tag) => hiddenTagSet.has(tag)));

  return paints
    .map((paint) => ({
      paint,
      score: scorePaint(paint, normalizedQuery, data.citations),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.paint.brandName.localeCompare(b.paint.brandName) ||
        a.paint.name.localeCompare(b.paint.name),
    )
    .map((item) => item.paint)
    .slice(0, maxResults);
}
