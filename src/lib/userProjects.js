export const USER_PROJECTS_STORAGE_KEY = "paintMapper.projects.v1";

export const PROJECT_STAGES = [
  "Basecoat",
  "Shade",
  "Layer",
  "Highlight",
  "Drybrush",
  "Glaze",
  "Details",
  "Varnish",
  "Other",
];

export const EMPTY_USER_PROJECTS = {
  version: 1,
  activeProjectId: null,
  projects: [],
  updatedAt: null,
};

function uniqueId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStep(step = {}) {
  return {
    id: step.id || uniqueId("step"),
    stage: PROJECT_STAGES.includes(step.stage) ? step.stage : PROJECT_STAGES[0],
    paintId: step.paintId || "",
    note: step.note || "",
  };
}

function normalizeProject(project = {}) {
  const now = new Date().toISOString();

  return {
    id: project.id || uniqueId("project"),
    name: String(project.name || "Untitled project").trim() || "Untitled project",
    createdAt: project.createdAt || now,
    updatedAt: project.updatedAt || project.createdAt || now,
    steps: (project.steps || []).map(normalizeStep),
  };
}

export function normalizeUserProjects(value) {
  const projects = (value?.projects || []).map(normalizeProject);
  const activeProjectId = projects.some((project) => project.id === value?.activeProjectId)
    ? value.activeProjectId
    : projects[0]?.id || null;

  return {
    version: 1,
    activeProjectId,
    projects,
    updatedAt: value?.updatedAt || null,
  };
}

export function loadUserProjects(storage = window.localStorage) {
  try {
    const raw = storage.getItem(USER_PROJECTS_STORAGE_KEY);
    if (!raw) return EMPTY_USER_PROJECTS;
    return normalizeUserProjects(JSON.parse(raw));
  } catch {
    return EMPTY_USER_PROJECTS;
  }
}

export function saveUserProjects(userProjects, storage = window.localStorage) {
  const normalized = normalizeUserProjects({
    ...userProjects,
    updatedAt: new Date().toISOString(),
  });
  storage.setItem(USER_PROJECTS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function createProject(userProjects, name) {
  const project = normalizeProject({
    id: uniqueId("project"),
    name,
    steps: [],
  });

  return normalizeUserProjects({
    ...userProjects,
    activeProjectId: project.id,
    projects: [...userProjects.projects, project],
  });
}

export function deleteProject(userProjects, projectId) {
  return normalizeUserProjects({
    ...userProjects,
    projects: userProjects.projects.filter((project) => project.id !== projectId),
    activeProjectId: userProjects.activeProjectId === projectId ? null : userProjects.activeProjectId,
  });
}

export function addProjectStep(userProjects, projectId) {
  return updateProject(userProjects, projectId, (project) => ({
    ...project,
    updatedAt: new Date().toISOString(),
    steps: [...project.steps, normalizeStep({ id: uniqueId("step") })],
  }));
}

export function updateProjectStep(userProjects, projectId, stepId, updates) {
  return updateProject(userProjects, projectId, (project) => ({
    ...project,
    updatedAt: new Date().toISOString(),
    steps: project.steps.map((step) => (step.id === stepId ? normalizeStep({ ...step, ...updates }) : step)),
  }));
}

export function removeProjectStep(userProjects, projectId, stepId) {
  return updateProject(userProjects, projectId, (project) => ({
    ...project,
    updatedAt: new Date().toISOString(),
    steps: project.steps.filter((step) => step.id !== stepId),
  }));
}

function updateProject(userProjects, projectId, updater) {
  return normalizeUserProjects({
    ...userProjects,
    activeProjectId: projectId,
    projects: userProjects.projects.map((project) => (project.id === projectId ? updater(project) : project)),
  });
}

export function buildProjectRecipeText(project, paintById) {
  const lines = [`${project.name} Recipe`, ""];

  if (!project.steps.length) {
    lines.push("No recipe steps yet.");
    return lines.join("\n");
  }

  project.steps.forEach((step, index) => {
    const paint = step.paintId ? paintById.get(step.paintId) : null;
    const paintName = paint ? `${paint.name} (${paint.brandName})` : "No paint selected";
    const note = step.note ? ` - ${step.note}` : "";
    lines.push(`${index + 1}. ${step.stage}: ${paintName}${note}`);
  });

  return lines.join("\n");
}
