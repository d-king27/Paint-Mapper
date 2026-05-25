import React, { useEffect, useMemo, useState } from "react";
import paintData from "../data/paint-compatibility.json";

const MAX_RESULTS = 80;
const ALL_BRANDS = "all";

function noteTitle(tag) {
  const citation = paintData.citations[tag];
  return citation ? `${citation.label}: ${citation.text}` : `Note ${tag}`;
}

function noteLabel(tag) {
  return paintData.citations[tag]?.label || `Note ${tag}`;
}

function getPaintTags(paint) {
  return [...paint.citationTags, ...(paint.excludedNames.length ? ["struckThroughPaintName"] : [])];
}

function paintSearchText(paint) {
  const notes = paint.citationTags.map((tag) => noteTitle(tag)).join(" ");
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

function scorePaint(paint, query) {
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
  if (paintSearchText(paint).includes(query)) return 25;

  return 0;
}

function NotePills({ tags }) {
  if (!tags.length) return null;

  return (
    <span className="note-stack">
      {tags.map((tag) => (
        <span className="note-pill" title={noteTitle(tag)} key={tag}>
          {noteLabel(tag)}
        </span>
      ))}
    </span>
  );
}

function ResultItem({ paint, selected, onSelect }) {
  return (
    <button
      className="result-item"
      type="button"
      role="listitem"
      aria-selected={selected}
      onClick={() => onSelect(paint.id)}
    >
      <span className="swatch" style={{ background: paint.hex }} aria-hidden="true" />
      <span className="result-text">
        <strong>{paint.name}</strong>
        <span>
          {paint.brandName} - {paint.hex}
        </span>
      </span>
      <NotePills tags={getPaintTags(paint)} />
    </button>
  );
}

function DetailPanel({ paint, color, paintById, visibleBrands }) {
  if (!paint || !color) {
    return (
      <section className="detail-panel" aria-label="Paint equivalents">
        <div className="empty-state">
          <div className="empty-swatch" aria-hidden="true" />
          <h2>Pick a paint to map its equivalents</h2>
          <p>Search for something you own, then use the brand filters to compare ranges.</p>
        </div>
      </section>
    );
  }

  const visibleEquivalents = paintData.brands
    .filter((brand) => visibleBrands.has(brand.id))
    .map((brand) => {
      const paintId = color.equivalents[brand.id];
      const equivalent = paintId ? paintById.get(paintId) : null;
      return { brand, equivalent };
    })
    .filter(({ equivalent }) => Boolean(equivalent));

  return (
    <section className="detail-panel" aria-label="Paint equivalents">
      <div className="detail-header">
        <div className="large-swatch" style={{ background: paint.hex }} aria-hidden="true" />
        <div className="selected-copy">
          <h2>{paint.name}</h2>
          <p>{paint.brandName} equivalent row</p>
          <div className="hex-line">
            <span className="brand-chip">{paint.brandName}</span>
            <span className="hex-chip">{paint.hex}</span>
            <span className="hex-chip">{color.paintIds.length} listed paints</span>
          </div>
        </div>
      </div>

      <div className="equivalent-section">
        <div className="section-title">
          <h3>Equivalent Colours</h3>
          <span>{visibleEquivalents.length} listed matches</span>
        </div>
        <div className="equivalent-grid">
          {visibleEquivalents.map(({ equivalent }) => {
            const raw = equivalent.rawText !== equivalent.name ? equivalent.rawText : "";
            return (
              <article
                className={`equivalent-card${equivalent.id === paint.id ? " is-selected" : ""}`}
                key={equivalent.id}
              >
                <div className="equivalent-brand">{equivalent.brandName}</div>
                <div className="equivalent-name">{equivalent.name || equivalent.excludedNames[0]}</div>
                {raw ? <div className="equivalent-raw">{raw}</div> : null}
                <NotePills tags={getPaintTags(equivalent)} />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [ownedBrand, setOwnedBrand] = useState(ALL_BRANDS);
  const [resultMode, setResultMode] = useState("matches");
  const [selectedPaintId, setSelectedPaintId] = useState(null);
  const [visibleBrands, setVisibleBrands] = useState(() => new Set(paintData.brands.map((brand) => brand.id)));

  const paintById = useMemo(() => new Map(paintData.paints.map((paint) => [paint.id, paint])), []);
  const colorById = useMemo(() => new Map(paintData.colors.map((color) => [color.id, color])), []);

  const filteredPaints = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let paints = paintData.paints.filter((paint) => paint.name);

    if (ownedBrand !== ALL_BRANDS) {
      paints = paints.filter((paint) => paint.brandId === ownedBrand);
    }

    if (resultMode === "notes") {
      paints = paints.filter((paint) => paint.citationTags.length || paint.excludedNames.length);
    }

    return paints
      .map((paint) => ({
        paint,
        score: resultMode === "all" && !normalizedQuery ? 1 : scorePaint(paint, normalizedQuery),
      }))
      .filter((item) => resultMode === "all" || !normalizedQuery || item.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.paint.brandName.localeCompare(b.paint.brandName) ||
          a.paint.name.localeCompare(b.paint.name),
      )
      .map((item) => item.paint)
      .slice(0, MAX_RESULTS);
  }, [ownedBrand, query, resultMode]);

  useEffect(() => {
    if (!filteredPaints.length) {
      setSelectedPaintId(null);
      return;
    }

    if (!selectedPaintId || !filteredPaints.some((paint) => paint.id === selectedPaintId)) {
      setSelectedPaintId(filteredPaints[0].id);
    }
  }, [filteredPaints, selectedPaintId]);

  const selectedPaint = selectedPaintId ? paintById.get(selectedPaintId) : null;
  const selectedColor = selectedPaint ? colorById.get(selectedPaint.colorId) : null;

  function toggleVisibleBrand(brandId) {
    setVisibleBrands((current) => {
      const next = new Set(current);
      if (next.has(brandId) && next.size > 1) {
        next.delete(brandId);
      } else {
        next.add(brandId);
      }
      return next;
    });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span style={{ background: "#991115" }} />
            <span style={{ background: "#31639c" }} />
            <span style={{ background: "#9c8a53" }} />
          </div>
          <div>
            <h1>Paint Mapper</h1>
            <p>
              {paintData.paints.length} paints - {paintData.colors.length} colour rows - {paintData.brands.length} brands
            </p>
          </div>
        </div>
        <a
          className="source-link"
          href="https://www.dakkadakka.com/wiki/en/paint_range_compatibility_chart"
          target="_blank"
          rel="noreferrer"
        >
          Source
        </a>
      </header>

      <main className="mapper" aria-live="polite">
        <section className="search-panel" aria-label="Paint search">
          <div className="search-box">
            <label htmlFor="paintSearch">Search by paint, brand, note, or hex</label>
            <div className="search-row">
              <input
                id="paintSearch"
                type="search"
                autoComplete="off"
                placeholder="Try Mephiston Red, Nuln Oil, Vallejo, #991115..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button className="icon-button" type="button" title="Clear search" aria-label="Clear search" onClick={() => setQuery("")}>
                x
              </button>
            </div>
          </div>

          <div className="filter-grid">
            <label htmlFor="ownedBrand">
              Owned brand
              <select id="ownedBrand" value={ownedBrand} onChange={(event) => setOwnedBrand(event.target.value)}>
                <option value={ALL_BRANDS}>Any brand</option>
                {paintData.brands.map((brand) => (
                  <option value={brand.id} key={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="resultMode">
              Result type
              <select id="resultMode" value={resultMode} onChange={(event) => setResultMode(event.target.value)}>
                <option value="matches">Text matches</option>
                <option value="all">All paints</option>
                <option value="notes">With notes</option>
              </select>
            </label>
          </div>

          <div className="brand-strip" aria-label="Visible equivalent brands">
            {paintData.brands.map((brand) => (
              <button
                className="brand-toggle"
                type="button"
                aria-pressed={visibleBrands.has(brand.id)}
                title={`Toggle ${brand.name}`}
                onClick={() => toggleVisibleBrand(brand.id)}
                key={brand.id}
              >
                {brand.name}
              </button>
            ))}
          </div>

          <div className="result-meta">
            <span id="resultCount">
              {filteredPaints.length} {filteredPaints.length === 1 ? "paint" : "paints"}
            </span>
            <span>{query.trim() ? "Showing best matches" : "Showing starter list"}</span>
          </div>

          <div className="results" role="list">
            {filteredPaints.length ? (
              filteredPaints.map((paint) => (
                <ResultItem
                  paint={paint}
                  selected={paint.id === selectedPaintId}
                  onSelect={setSelectedPaintId}
                  key={paint.id}
                />
              ))
            ) : (
              <div className="empty-results">No matching paints found.</div>
            )}
          </div>
        </section>

        <DetailPanel paint={selectedPaint} color={selectedColor} paintById={paintById} visibleBrands={visibleBrands} />
      </main>
    </div>
  );
}
