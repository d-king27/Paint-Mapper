const DATA_URL = "../data/paint-compatibility.json";
const MAX_RESULTS = 80;

const state = {
  data: null,
  paintById: new Map(),
  colorById: new Map(),
  visibleBrands: new Set(),
  selectedPaintId: null,
};

const els = {
  dataSummary: document.querySelector("#dataSummary"),
  search: document.querySelector("#paintSearch"),
  clear: document.querySelector("#clearSearch"),
  ownedBrand: document.querySelector("#ownedBrand"),
  resultMode: document.querySelector("#resultMode"),
  brandStrip: document.querySelector("#brandStrip"),
  resultCount: document.querySelector("#resultCount"),
  activeHint: document.querySelector("#activeHint"),
  results: document.querySelector("#results"),
  detailPanel: document.querySelector("#detailPanel"),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function noteTitle(tag) {
  const citation = state.data?.citations?.[tag];
  return citation ? `${citation.label}: ${citation.text}` : `Note ${tag}`;
}

function noteLabel(tag) {
  const citation = state.data?.citations?.[tag];
  return citation?.label || `Note ${tag}`;
}

function notePills(tags = []) {
  return tags
    .map((tag) => {
      return `<span class="note-pill" title="${escapeHtml(noteTitle(tag))}">${escapeHtml(noteLabel(tag))}</span>`;
    })
    .join("");
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

function getFilteredPaints() {
  const query = els.search.value.trim().toLowerCase();
  const brandId = els.ownedBrand.value;
  const mode = els.resultMode.value;

  let paints = state.data.paints.filter((paint) => paint.name);
  if (brandId !== "all") {
    paints = paints.filter((paint) => paint.brandId === brandId);
  }
  if (mode === "notes") {
    paints = paints.filter((paint) => paint.citationTags.length || paint.excludedNames.length);
  }

  const scored = paints
    .map((paint) => ({ paint, score: mode === "all" && !query ? 1 : scorePaint(paint, query) }))
    .filter((item) => mode === "all" || !query || item.score > 0)
    .sort((a, b) => b.score - a.score || a.paint.brandName.localeCompare(b.paint.brandName) || a.paint.name.localeCompare(b.paint.name));

  return scored.map((item) => item.paint).slice(0, MAX_RESULTS);
}

function renderBrandControls() {
  els.ownedBrand.innerHTML = [
    `<option value="all">Any brand</option>`,
    ...state.data.brands.map((brand) => `<option value="${brand.id}">${escapeHtml(brand.name)}</option>`),
  ].join("");

  state.visibleBrands = new Set(state.data.brands.map((brand) => brand.id));
  els.brandStrip.innerHTML = state.data.brands
    .map(
      (brand) =>
        `<button class="brand-toggle" type="button" data-brand-id="${brand.id}" aria-pressed="true" title="Toggle ${escapeHtml(
          brand.name,
        )}">${escapeHtml(brand.name)}</button>`,
    )
    .join("");
}

function renderResults() {
  const paints = getFilteredPaints();
  const query = els.search.value.trim();
  els.resultCount.textContent = `${paints.length} ${paints.length === 1 ? "paint" : "paints"}`;
  els.activeHint.textContent = query ? "Showing best matches" : "Showing starter list";

  if (!paints.length) {
    els.results.innerHTML = `<div class="empty-results">No matching paints found.</div>`;
    return;
  }

  if (!state.selectedPaintId || !paints.some((paint) => paint.id === state.selectedPaintId)) {
    state.selectedPaintId = paints[0].id;
  }

  els.results.innerHTML = paints
    .map((paint) => {
      const selected = paint.id === state.selectedPaintId;
      const notes = [...paint.citationTags, ...(paint.excludedNames.length ? ["struckThroughPaintName"] : [])];
      return `
        <button class="result-item" type="button" role="listitem" data-paint-id="${paint.id}" aria-selected="${selected}">
          <span class="swatch" style="background:${paint.hex}" aria-hidden="true"></span>
          <span class="result-text">
            <strong>${escapeHtml(paint.name)}</strong>
            <span>${escapeHtml(paint.brandName)} · ${escapeHtml(paint.hex)}</span>
          </span>
          <span class="note-stack">${notePills(notes)}</span>
        </button>
      `;
    })
    .join("");

  renderDetail();
}

function renderDetail() {
  const paint = state.paintById.get(state.selectedPaintId);
  if (!paint) return;

  const color = state.colorById.get(paint.colorId);
  const visibleEquivalents = state.data.brands
    .filter((brand) => state.visibleBrands.has(brand.id))
    .map((brand) => {
      const paintId = color.equivalents[brand.id];
      const equivalent = paintId ? state.paintById.get(paintId) : null;
      return { brand, equivalent };
    })
    .filter(({ equivalent }) => Boolean(equivalent));

  const equivalents = visibleEquivalents
    .map(({ brand, equivalent }) => {
      const selectedClass = equivalent?.id === paint.id ? " is-selected" : "";

      const notes = [...equivalent.citationTags, ...(equivalent.excludedNames.length ? ["struckThroughPaintName"] : [])];
      const raw = equivalent.rawText !== equivalent.name ? equivalent.rawText : "";
      return `
        <article class="equivalent-card${selectedClass}">
          <div class="equivalent-brand">${escapeHtml(equivalent.brandName)}</div>
          <div class="equivalent-name">${escapeHtml(equivalent.name || equivalent.excludedNames[0])}</div>
          ${raw ? `<div class="equivalent-raw">${escapeHtml(raw)}</div>` : ""}
          <div class="note-stack">${notePills(notes)}</div>
        </article>
      `;
    })
    .join("");

  els.detailPanel.innerHTML = `
    <div class="detail-header">
      <div class="large-swatch" style="background:${paint.hex}" aria-hidden="true"></div>
      <div class="selected-copy">
        <h2>${escapeHtml(paint.name)}</h2>
        <p>${escapeHtml(paint.brandName)} equivalent row</p>
        <div class="hex-line">
          <span class="brand-chip">${escapeHtml(paint.brandName)}</span>
          <span class="hex-chip">${escapeHtml(paint.hex)}</span>
          <span class="hex-chip">${color.paintIds.length} listed paints</span>
        </div>
      </div>
    </div>
    <div class="equivalent-section">
      <div class="section-title">
        <h3>Equivalent Colours</h3>
        <span>${visibleEquivalents.length} listed matches</span>
      </div>
      <div class="equivalent-grid">${equivalents}</div>
    </div>
  `;
}

function bindEvents() {
  els.search.addEventListener("input", renderResults);
  els.ownedBrand.addEventListener("change", renderResults);
  els.resultMode.addEventListener("change", renderResults);

  els.clear.addEventListener("click", () => {
    els.search.value = "";
    els.search.focus();
    renderResults();
  });

  els.results.addEventListener("click", (event) => {
    const item = event.target.closest("[data-paint-id]");
    if (!item) return;
    state.selectedPaintId = item.dataset.paintId;
    renderResults();
  });

  els.brandStrip.addEventListener("click", (event) => {
    const button = event.target.closest("[data-brand-id]");
    if (!button) return;
    const brandId = button.dataset.brandId;
    if (state.visibleBrands.has(brandId) && state.visibleBrands.size > 1) {
      state.visibleBrands.delete(brandId);
      button.setAttribute("aria-pressed", "false");
    } else {
      state.visibleBrands.add(brandId);
      button.setAttribute("aria-pressed", "true");
    }
    renderDetail();
  });
}

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Could not load paint data: ${response.status}`);
    state.data = await response.json();
    state.data.paints.forEach((paint) => state.paintById.set(paint.id, paint));
    state.data.colors.forEach((color) => state.colorById.set(color.id, color));

    els.dataSummary.textContent = `${state.data.paints.length} paints · ${state.data.colors.length} colour rows · ${state.data.brands.length} brands`;
    renderBrandControls();
    bindEvents();
    renderResults();
  } catch (error) {
    els.dataSummary.textContent = "Paint data failed to load";
    els.detailPanel.innerHTML = `
      <div class="empty-state">
        <div class="empty-swatch" aria-hidden="true"></div>
        <h2>Could not load paint data</h2>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

init();
