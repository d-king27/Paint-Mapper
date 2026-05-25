import React, { useEffect, useMemo, useState } from "react";
import {
  ALL_BRANDS,
  DEFAULT_HIDDEN_TAGS,
  filterPaints,
  getAvailableTags,
  getNoteLabel,
  getNoteTitle,
  getPaintTags,
} from "./lib/paintSearch";

function NotePills({ citations, tags }) {
  if (!tags.length) return null;

  return (
    <span className="note-stack">
      {tags.map((tag) => (
        <span className="note-pill" title={getNoteTitle(citations, tag)} key={tag}>
          {getNoteLabel(citations, tag)}
        </span>
      ))}
    </span>
  );
}

function ResultItem({ citations, paint, selected, onSelect }) {
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
      <NotePills citations={citations} tags={getPaintTags(paint)} />
    </button>
  );
}

function DetailPanel({ data, hiddenTags, paint, color, paintById, visibleBrands }) {
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

  const visibleEquivalents = data.brands
    .filter((brand) => visibleBrands.has(brand.id))
    .map((brand) => {
      const paintId = color.equivalents[brand.id];
      const equivalent = paintId ? paintById.get(paintId) : null;
      return { brand, equivalent };
    })
    .filter(({ equivalent }) => {
      if (!equivalent) return false;
      return !getPaintTags(equivalent).some((tag) => hiddenTags.has(tag));
    });

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
                <div className="equivalent-card-header">
                  <span className="equivalent-swatch" style={{ background: equivalent.hex }} aria-hidden="true" />
                  <div>
                    <div className="equivalent-brand">{equivalent.brandName}</div>
                    <div className="equivalent-name">{equivalent.name || equivalent.excludedNames[0]}</div>
                  </div>
                </div>
                {raw ? <div className="equivalent-raw">{raw}</div> : null}
                <NotePills citations={data.citations} tags={getPaintTags(equivalent)} />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function App({ data }) {
  const [query, setQuery] = useState("");
  const [ownedBrand, setOwnedBrand] = useState(ALL_BRANDS);
  const [hiddenTags, setHiddenTags] = useState(() => new Set(DEFAULT_HIDDEN_TAGS));
  const [selectedPaintId, setSelectedPaintId] = useState(null);
  const [visibleBrands, setVisibleBrands] = useState(() => new Set(data.brands.map((brand) => brand.id)));

  const paintById = useMemo(() => new Map(data.paints.map((paint) => [paint.id, paint])), [data]);
  const colorById = useMemo(() => new Map(data.colors.map((color) => [color.id, color])), [data]);
  const availableTags = useMemo(() => getAvailableTags(data), [data]);

  const filteredPaints = useMemo(() => {
    return filterPaints(data, { query, ownedBrand, hiddenTags: [...hiddenTags] });
  }, [data, hiddenTags, ownedBrand, query]);

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

  function toggleHiddenTag(tag) {
    setHiddenTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }

  const hasSearched = Boolean(query.trim());

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
              {data.paints.length} paints - {data.colors.length} colour rows - {data.brands.length} brands
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
                {data.brands.map((brand) => (
                  <option value={brand.id} key={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="tag-filter-group" aria-label="Tag filters">
              <span className="control-label">Hide tagged paints</span>
              <div className="tag-filter-list">
                {availableTags.map((tag) => (
                  <button
                    className="tag-filter"
                    type="button"
                    aria-pressed={hiddenTags.has(tag)}
                    title={`Toggle ${getNoteTitle(data.citations, tag)}`}
                    onClick={() => toggleHiddenTag(tag)}
                    key={tag}
                  >
                    {getNoteLabel(data.citations, tag)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="brand-strip" aria-label="Visible equivalent brands">
            {data.brands.map((brand) => (
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
            <span>{hasSearched ? "Showing best matches" : "Search to begin"}</span>
          </div>

          <div className="results" role="list">
            {!hasSearched ? (
              <div className="empty-results">Search for a paint to begin.</div>
            ) : filteredPaints.length ? (
              filteredPaints.map((paint) => (
                <ResultItem
                  paint={paint}
                  citations={data.citations}
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

        <DetailPanel
          data={data}
          hiddenTags={hiddenTags}
          paint={selectedPaint}
          color={selectedColor}
          paintById={paintById}
          visibleBrands={visibleBrands}
        />
      </main>
    </div>
  );
}
