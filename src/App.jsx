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
import {
  buildShoppingListText,
  getPaintCollectionStatus,
  loadUserPaints,
  saveUserPaints,
  setPaintCollectionStatus,
} from "./lib/userPaints";

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

function PaintActions({ onSetStatus, status }) {
  return (
    <div className="paint-actions" aria-label="Paint collection actions">
      <button
        className="paint-action"
        type="button"
        aria-pressed={status === "owned"}
        onClick={() => onSetStatus(status === "owned" ? "none" : "owned")}
      >
        {status === "owned" ? "In my paints" : status === "wishlist" ? "Move to my paints" : "Add to my paints"}
      </button>
      <button
        className="paint-action"
        type="button"
        aria-pressed={status === "wishlist"}
        onClick={() => onSetStatus(status === "wishlist" ? "none" : "wishlist")}
      >
        {status === "wishlist" ? "Wishlisted" : "Add to wishlist"}
      </button>
    </div>
  );
}

function ResultItem({ citations, onSelect, paint, selected }) {
  return (
    <article
      className="result-item"
      role="listitem"
      aria-selected={selected}
    >
      <button className="result-select" type="button" onClick={() => onSelect(paint.id)}>
        <span className="swatch" style={{ background: paint.hex }} aria-hidden="true" />
        <span className="result-text">
          <strong>{paint.name}</strong>
          <span>
            {paint.brandName} - {paint.hex}
          </span>
        </span>
      </button>
      <NotePills citations={citations} tags={getPaintTags(paint)} />
    </article>
  );
}

function DetailPanel({ data, hiddenTags, onSetStatus, paint, color, paintById, userPaints, visibleBrands }) {
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
                <PaintActions
                  onSetStatus={(status) => onSetStatus(equivalent.id, status)}
                  status={getPaintCollectionStatus(userPaints, equivalent.id)}
                />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PaintCollectionSection({ citations, emptyText, onSetStatus, paintIds, paintById, title, userPaints }) {
  const paints = paintIds.map((id) => paintById.get(id)).filter(Boolean);

  return (
    <section className="collection-section" aria-label={title}>
      <div className="section-title">
        <h3>{title}</h3>
        <span>{paints.length} paints</span>
      </div>
      {paints.length ? (
        <div className="collection-grid">
          {paints.map((paint) => (
            <article className="collection-card" key={paint.id}>
              <span className="equivalent-swatch" style={{ background: paint.hex }} aria-hidden="true" />
              <div className="collection-copy">
                <strong>{paint.name}</strong>
                <span>
                  {paint.brandName} - {paint.hex}
                </span>
                <NotePills citations={citations} tags={getPaintTags(paint)} />
              </div>
              <button className="paint-action" type="button" onClick={() => onSetStatus(paint.id, "none")}>
                Remove
              </button>
              {getPaintCollectionStatus(userPaints, paint.id) === "wishlist" ? (
                <button className="paint-action" type="button" onClick={() => onSetStatus(paint.id, "owned")}>
                  Move to owned
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-results">{emptyText}</div>
      )}
    </section>
  );
}

function MyPaintsView({ data, exportStatus, onExport, onSetStatus, paintById, userPaints }) {
  return (
    <section className="my-paints-panel" aria-label="My Paints">
      <div className="my-paints-header">
        <div>
          <h2>My Paints</h2>
          <p>Track paints you own or want, stored locally in this browser.</p>
        </div>
        <button className="source-link" type="button" onClick={onExport}>
          Copy shopping list
        </button>
      </div>
      {exportStatus ? <div className="export-status">{exportStatus}</div> : null}
      <PaintCollectionSection
        citations={data.citations}
        emptyText="No owned paints yet. Add paints from the mapper."
        onSetStatus={onSetStatus}
        paintById={paintById}
        paintIds={userPaints.ownedPaintIds}
        title="Owned Paints"
        userPaints={userPaints}
      />
      <PaintCollectionSection
        citations={data.citations}
        emptyText="No wishlist paints yet. Add paints from the mapper."
        onSetStatus={onSetStatus}
        paintById={paintById}
        paintIds={userPaints.wishlistPaintIds}
        title="Wishlist"
        userPaints={userPaints}
      />
    </section>
  );
}

export default function App({ data }) {
  const [activeView, setActiveView] = useState("mapper");
  const [query, setQuery] = useState("");
  const [ownedBrand, setOwnedBrand] = useState(ALL_BRANDS);
  const [hiddenTags, setHiddenTags] = useState(() => new Set(DEFAULT_HIDDEN_TAGS));
  const [selectedPaintId, setSelectedPaintId] = useState(null);
  const [exportStatus, setExportStatus] = useState("");
  const [userPaints, setUserPaints] = useState(() => loadUserPaints());
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
  const selectedPaintStatus = selectedPaint ? getPaintCollectionStatus(userPaints, selectedPaint.id) : "none";

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

  function setPaintStatus(paintId, status) {
    setUserPaints((current) => saveUserPaints(setPaintCollectionStatus(current, paintId, status)));
  }

  async function exportUserPaints() {
    const text = buildShoppingListText(userPaints, paintById);

    try {
      await navigator.clipboard.writeText(text);
      setExportStatus("Shopping list copied to clipboard.");
    } catch {
      setExportStatus(text);
    }
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
            <h1>Litanies of Colour</h1>
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

      <nav className="view-tabs" aria-label="Main sections">
        <button type="button" aria-pressed={activeView === "mapper"} onClick={() => setActiveView("mapper")}>
          Mapper
        </button>
        <button type="button" aria-pressed={activeView === "my-paints"} onClick={() => setActiveView("my-paints")}>
          My Paints
        </button>
      </nav>

      <main className={`mapper ${activeView === "mapper" ? "mapper-view" : "my-paints-view"}`} aria-live="polite">
        {activeView === "mapper" ? (
          <>
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

          {selectedPaint ? (
            <div className="selected-result-actions" aria-label="Highlighted paint actions">
              <div>
                <span className="control-label">Highlighted paint</span>
                <strong>{selectedPaint.name}</strong>
                <span>
                  {selectedPaint.brandName} - {selectedPaint.hex}
                </span>
              </div>
              <PaintActions
                onSetStatus={(status) => setPaintStatus(selectedPaint.id, status)}
                status={selectedPaintStatus}
              />
            </div>
          ) : null}

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
            onSetStatus={setPaintStatus}
            paint={selectedPaint}
            color={selectedColor}
            paintById={paintById}
            userPaints={userPaints}
            visibleBrands={visibleBrands}
          />
          </>
        ) : (
          <MyPaintsView
            data={data}
            exportStatus={exportStatus}
            onExport={exportUserPaints}
            onSetStatus={setPaintStatus}
            paintById={paintById}
            userPaints={userPaints}
          />
        )}
      </main>
    </div>
  );
}
