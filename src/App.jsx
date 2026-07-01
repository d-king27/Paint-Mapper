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
import {
  addProjectStep,
  buildProjectRecipeText,
  createProject,
  deleteProject,
  loadUserProjects,
  PROJECT_STAGES,
  removeProjectStep,
  saveUserProjects,
  updateProjectStep,
} from "./lib/userProjects";

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
      <div className="detail-panel-title">
        <h2>Equivalent Paints</h2>
        <span>{visibleEquivalents.length} listed matches</span>
      </div>
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
          <h3>Matches by Brand</h3>
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

function ProjectsView({
  exportStatus,
  onAddStep,
  onCreateProject,
  onDeleteProject,
  onExportProject,
  onRemoveStep,
  onSelectProject,
  onUpdateStep,
  paintOptions,
  onOpenMyPaints,
  userProjects,
}) {
  const [projectName, setProjectName] = useState("");
  const activeProject = userProjects.projects.find((project) => project.id === userProjects.activeProjectId) || null;

  function submitProject(event) {
    event.preventDefault();
    if (!projectName.trim()) return;
    onCreateProject(projectName);
    setProjectName("");
  }

  return (
    <section className="projects-panel" aria-label="Projects">
      <div className="projects-header">
        <div>
          <h2>Projects</h2>
          <p>Build simple paint recipes for minis and keep them saved in this browser.</p>
        </div>
        {activeProject ? (
          <button className="source-link" type="button" onClick={() => onExportProject(activeProject)}>
            Copy recipe
          </button>
        ) : null}
      </div>
      {exportStatus ? <div className="export-status">{exportStatus}</div> : null}

      <form className="project-create" onSubmit={submitProject}>
        <label htmlFor="projectName">
          Project name
          <input
            id="projectName"
            type="text"
            placeholder="e.g. Blood Angels Terminator"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
          />
        </label>
        <button className="paint-action" type="submit">
          Create project
        </button>
      </form>

      {userProjects.projects.length ? (
        <div className="project-workspace">
          <aside className="project-list" aria-label="Project list">
            {userProjects.projects.map((project) => (
              <button
                className="project-list-item"
                type="button"
                aria-pressed={project.id === activeProject?.id}
                onClick={() => onSelectProject(project.id)}
                key={project.id}
              >
                <strong>{project.name}</strong>
                <span>{project.steps.length} steps</span>
              </button>
            ))}
          </aside>

          {activeProject ? (
            <div className="project-editor">
              <div className="project-editor-header">
                <div>
                  <h3>{activeProject.name}</h3>
                  <span>{activeProject.steps.length} recipe steps</span>
                </div>
                <div className="project-editor-actions">
                  <button className="paint-action" type="button" onClick={() => onAddStep(activeProject.id)}>
                    Add recipe step
                  </button>
                  <button className="paint-action" type="button" onClick={() => onDeleteProject(activeProject.id)}>
                    Delete project
                  </button>
                </div>
              </div>

              {activeProject.steps.length ? (
                <div className="recipe-list">
                  {activeProject.steps.map((step, index) => (
                    <article className="recipe-step" key={step.id}>
                      <div className="recipe-step-number">{index + 1}</div>
                      <label>
                        Stage
                        <select
                          value={step.stage}
                          onChange={(event) => onUpdateStep(activeProject.id, step.id, { stage: event.target.value })}
                        >
                          {PROJECT_STAGES.map((stage) => (
                            <option value={stage} key={stage}>
                              {stage}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Paint
                        <select
                          value={step.paintId}
                          onChange={(event) => onUpdateStep(activeProject.id, step.id, { paintId: event.target.value })}
                          disabled={!paintOptions.length}
                        >
                          <option value="">{paintOptions.length ? "Choose paint" : "Add paints in My Paints first"}</option>
                          {paintOptions.map((paint) => (
                            <option value={paint.id} key={paint.id}>
                              {paint.name} - {paint.brandName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="recipe-note">
                        Note
                        <input
                          type="text"
                          placeholder="Optional"
                          value={step.note}
                          onChange={(event) => onUpdateStep(activeProject.id, step.id, { note: event.target.value })}
                        />
                      </label>
                      <button className="paint-action" type="button" onClick={() => onRemoveStep(activeProject.id, step.id)}>
                        Remove
                      </button>
                    </article>
                  ))}
                  {!paintOptions.length ? (
                    <div className="empty-results">
                      Add paints to My Paints before assigning paints to recipe steps.
                      <button className="paint-action" type="button" onClick={onOpenMyPaints}>
                        Go to My Paints
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="empty-results">No recipe steps yet. Add a step to start planning this project.</div>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="empty-results">No projects yet. Name a project to start a recipe.</div>
      )}
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
  const [projectExportStatus, setProjectExportStatus] = useState("");
  const [userPaints, setUserPaints] = useState(() => loadUserPaints());
  const [userProjects, setUserProjects] = useState(() => loadUserProjects());
  const [visibleBrands, setVisibleBrands] = useState(() => new Set(data.brands.map((brand) => brand.id)));

  const paintById = useMemo(() => new Map(data.paints.map((paint) => [paint.id, paint])), [data]);
  const colorById = useMemo(() => new Map(data.colors.map((color) => [color.id, color])), [data]);
  const availableTags = useMemo(() => getAvailableTags(data), [data]);
  const ownedPaintOptions = useMemo(
    () => userPaints.ownedPaintIds.map((paintId) => paintById.get(paintId)).filter(Boolean),
    [paintById, userPaints.ownedPaintIds],
  );

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

  function updateProjects(updater) {
    setUserProjects((current) => saveUserProjects(updater(current)));
  }

  function selectProject(projectId) {
    updateProjects((current) => ({ ...current, activeProjectId: projectId }));
  }

  function createNamedProject(name) {
    updateProjects((current) => createProject(current, name));
  }

  function deleteSelectedProject(projectId) {
    updateProjects((current) => deleteProject(current, projectId));
  }

  function addRecipeStep(projectId) {
    updateProjects((current) => addProjectStep(current, projectId));
  }

  function changeRecipeStep(projectId, stepId, updates) {
    updateProjects((current) => updateProjectStep(current, projectId, stepId, updates));
  }

  function removeRecipeStep(projectId, stepId) {
    updateProjects((current) => removeProjectStep(current, projectId, stepId));
  }

  async function exportProjectRecipe(project) {
    const text = buildProjectRecipeText(project, paintById);

    try {
      await navigator.clipboard.writeText(text);
      setProjectExportStatus("Recipe copied to clipboard.");
    } catch {
      setProjectExportStatus(text);
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
        <nav className="view-tabs" aria-label="Main sections">
          <button type="button" aria-pressed={activeView === "mapper"} onClick={() => setActiveView("mapper")}>
            Paint Search
          </button>
          <button type="button" aria-pressed={activeView === "my-paints"} onClick={() => setActiveView("my-paints")}>
            My Paints
          </button>
          <button type="button" aria-pressed={activeView === "projects"} onClick={() => setActiveView("projects")}>
            Projects
          </button>
        </nav>
        <a
          className="source-link"
          href="https://www.dakkadakka.com/wiki/en/paint_range_compatibility_chart"
          target="_blank"
          rel="noreferrer"
        >
          Source
        </a>
      </header>

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
        ) : activeView === "my-paints" ? (
          <MyPaintsView
            data={data}
            exportStatus={exportStatus}
            onExport={exportUserPaints}
            onSetStatus={setPaintStatus}
            paintById={paintById}
            userPaints={userPaints}
          />
        ) : (
          <ProjectsView
            exportStatus={projectExportStatus}
            onAddStep={addRecipeStep}
            onCreateProject={createNamedProject}
            onDeleteProject={deleteSelectedProject}
            onExportProject={exportProjectRecipe}
            onRemoveStep={removeRecipeStep}
            onSelectProject={selectProject}
            onUpdateStep={changeRecipeStep}
            paintOptions={ownedPaintOptions}
            onOpenMyPaints={() => setActiveView("my-paints")}
            userProjects={userProjects}
          />
        )}
      </main>
    </div>
  );
}
