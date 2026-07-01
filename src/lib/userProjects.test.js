import { describe, expect, it, vi } from "vitest";
import {
  addProjectStep,
  buildProjectRecipeText,
  createProject,
  EMPTY_USER_PROJECTS,
  loadUserProjects,
  saveUserProjects,
  updateProjectStep,
  USER_PROJECTS_STORAGE_KEY,
} from "./userProjects";
import { paintDataFixture } from "../test/fixtures/paintData";

function createStorage() {
  const store = new Map();
  return {
    getItem: vi.fn((key) => store.get(key) || null),
    setItem: vi.fn((key, value) => store.set(key, value)),
  };
}

describe("user project storage", () => {
  it("loads an empty project collection when storage has no data", () => {
    expect(loadUserProjects(createStorage())).toEqual(EMPTY_USER_PROJECTS);
  });

  it("creates a named active project", () => {
    const userProjects = createProject(EMPTY_USER_PROJECTS, "Terminator Captain");

    expect(userProjects.projects[0].name).toBe("Terminator Captain");
    expect(userProjects.activeProjectId).toBe(userProjects.projects[0].id);
  });

  it("adds and updates a recipe step", () => {
    const created = createProject(EMPTY_USER_PROJECTS, "Test Marine");
    const projectId = created.activeProjectId;
    const withStep = addProjectStep(created, projectId);
    const stepId = withStep.projects[0].steps[0].id;
    const updated = updateProjectStep(withStep, projectId, stepId, {
      paintId: "paint-new-citadel-mephiston-red-991115-1",
      stage: "Basecoat",
    });

    expect(updated.projects[0].steps[0]).toMatchObject({
      paintId: "paint-new-citadel-mephiston-red-991115-1",
      stage: "Basecoat",
    });
  });

  it("saves normalized project data with a timestamp", () => {
    const storage = createStorage();
    const saved = saveUserProjects(createProject(EMPTY_USER_PROJECTS, "Test Project"), storage);

    expect(saved.updatedAt).toEqual(expect.any(String));
    expect(storage.setItem).toHaveBeenCalledWith(USER_PROJECTS_STORAGE_KEY, JSON.stringify(saved));
  });

  it("builds a plain text recipe", () => {
    const paintById = new Map(paintDataFixture.paints.map((paint) => [paint.id, paint]));
    const project = {
      name: "Red Armour",
      steps: [
        {
          id: "step-1",
          stage: "Basecoat",
          paintId: "paint-new-citadel-mephiston-red-991115-1",
          note: "Two thin coats",
        },
      ],
    };

    expect(buildProjectRecipeText(project, paintById)).toContain(
      "1. Basecoat: Mephiston Red (New Citadel) - Two thin coats",
    );
  });
});
