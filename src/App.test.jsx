import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { paintDataFixture } from "./test/fixtures/paintData";

function getHighlightedPaintActions() {
  return document.querySelector('[aria-label="Highlighted paint actions"]');
}

async function clickPaintResult(user, name) {
  await user.click(await screen.findByRole("button", { name: new RegExp(name) }));
}

describe("App", () => {
  it("searches paints and shows listed equivalents without empty brand cards", async () => {
    const user = userEvent.setup();
    render(<App data={paintDataFixture} />);

    await user.type(screen.getByLabelText("Search by paint, brand, note, or hex"), "Mephiston Red");
    await clickPaintResult(user, "Mephiston Red");

    expect(await screen.findByRole("heading", { name: "Mephiston Red" })).toBeInTheDocument();
    expect(screen.getByText("1 paint")).toBeInTheDocument();
    expect(screen.getAllByText("3 listed matches").length).toBeGreaterThan(0);
    expect(screen.getByText("Heavy Red (141)")).toBeInTheDocument();
    expect(screen.getByText("Mechrite Red")).toBeInTheDocument();
    expect(screen.queryByText("New Citadel equivalent row")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".equivalent-swatch")).toHaveLength(3);
    expect(screen.queryByText("No listed match")).not.toBeInTheDocument();
  });

  it("does not show starter results before searching", () => {
    render(<App data={paintDataFixture} />);

    expect(screen.getByText("Search for a paint to begin.")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Result type")).not.toBeInTheDocument();
  });

  it("renders readable note labels on paint results", async () => {
    const user = userEvent.setup();
    render(<App data={paintDataFixture} />);

    await user.type(screen.getByLabelText("Search by paint, brand, note, or hex"), "Dorn Yellow");

    const results = screen.getByRole("list");
    expect(within(results).getByText("approximate")).toBeInTheDocument();
  });

  it("shows tagged paints by default and hides them when a tag filter is toggled", async () => {
    const user = userEvent.setup();
    render(<App data={paintDataFixture} />);

    await user.type(screen.getByLabelText("Search by paint, brand, note, or hex"), "Mechrite Red");

    expect(screen.getAllByText("Mechrite Red").length).toBeGreaterThan(0);
    expect(screen.getAllByText("discontinued").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "discontinued" }));

    expect(screen.queryByText("Mechrite Red")).not.toBeInTheDocument();
  });

  it("adds paints to owned and wishlist lists", async () => {
    const user = userEvent.setup();
    render(<App data={paintDataFixture} />);

    await user.type(screen.getByLabelText("Search by paint, brand, note, or hex"), "Mephiston Red");
    await clickPaintResult(user, "Mephiston Red");
    await user.click(within(getHighlightedPaintActions()).getByRole("button", { name: "Add to my paints" }));
    await user.clear(screen.getByLabelText("Search by paint, brand, note, or hex"));
    await user.type(screen.getByLabelText("Search by paint, brand, note, or hex"), "Heavy Red");
    await clickPaintResult(user, "Heavy Red");
    await user.click(within(getHighlightedPaintActions()).getByRole("button", { name: "Add to wishlist" }));

    expect(screen.getByRole("heading", { name: "Owned Paints" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Wishlist" })).toBeInTheDocument();
    expect(screen.getAllByText("Mephiston Red").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Heavy Red (141)").length).toBeGreaterThan(0);
  });

  it("copies my paints as a plain text shopping list", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<App data={paintDataFixture} />);

    await user.type(screen.getByLabelText("Search by paint, brand, note, or hex"), "Mephiston Red");
    await clickPaintResult(user, "Mephiston Red");
    await user.click(within(getHighlightedPaintActions()).getByRole("button", { name: "Add to my paints" }));
    await user.click(screen.getByRole("button", { name: "Copy list" }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Litanies of Colour Paint List"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Mephiston Red"));
    expect(screen.getAllByText(/Mephiston Red/).length).toBeGreaterThan(0);
  });

  it("collapses the paint collection and equivalent paint panels", async () => {
    const user = userEvent.setup();
    render(<App data={paintDataFixture} />);

    await user.click(screen.getByRole("button", { name: "Collapse My Paints" }));

    expect(screen.getByRole("button", { name: "Expand My Paints" })).toBeInTheDocument();
    expect(screen.getByText("No owned paints yet.")).not.toBeVisible();

    await user.type(screen.getByLabelText("Search by paint, brand, note, or hex"), "Mephiston Red");
    await clickPaintResult(user, "Mephiston Red");
    await user.click(screen.getByRole("button", { name: "Collapse Equivalent Paints" }));

    expect(screen.getByRole("button", { name: "Expand Equivalent Paints" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mephiston Red" })).not.toBeInTheDocument();
  });

  it("creates a project and copies a paint recipe", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<App data={paintDataFixture} />);

    await user.type(screen.getByLabelText("Search by paint, brand, note, or hex"), "Mephiston Red");
    await clickPaintResult(user, "Mephiston Red");
    await user.click(within(getHighlightedPaintActions()).getByRole("button", { name: "Add to my paints" }));
    await user.click(screen.getByRole("button", { name: "Projects" }));
    await user.type(screen.getByLabelText("Project name"), "Test Marine");
    await user.click(screen.getByRole("button", { name: "Create project" }));
    await user.click(screen.getByRole("button", { name: "Add recipe step" }));
    await user.selectOptions(screen.getByLabelText("Paint"), "paint-new-citadel-mephiston-red-991115-1");
    await user.type(screen.getByLabelText("Note"), "Two thin coats");
    await user.click(screen.getByRole("button", { name: "Copy recipe" }));

    expect(screen.getByRole("button", { name: "Rename project Test Marine" })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Test Marine Recipe"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("1. Mephiston Red"));
    expect(screen.queryByLabelText("Stage")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Area")).not.toBeInTheDocument();
  });

  it("directs users to My Paints before choosing project paints", async () => {
    const user = userEvent.setup();
    render(<App data={paintDataFixture} />);

    await user.click(screen.getByRole("button", { name: "Projects" }));
    await user.type(screen.getByLabelText("Project name"), "No Paints Project");
    await user.click(screen.getByRole("button", { name: "Create project" }));
    await user.click(screen.getByRole("button", { name: "Add recipe step" }));

    expect(screen.getByText("Add paints to My Paints before assigning paints to recipe steps.")).toBeInTheDocument();
    expect(screen.getByLabelText("Paint")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Go to Paint Search" }));

    expect(screen.getByRole("heading", { name: "My Paints" })).toBeInTheDocument();
  });

  it("renames a project by editing the active project name", async () => {
    const user = userEvent.setup();
    render(<App data={paintDataFixture} />);

    await user.click(screen.getByRole("button", { name: "Projects" }));
    await user.type(screen.getByLabelText("Project name"), "Old Project");
    await user.click(screen.getByRole("button", { name: "Create project" }));
    await user.click(screen.getByRole("button", { name: "Rename project Old Project" }));
    await user.clear(screen.getByLabelText("Rename project"));
    await user.type(screen.getByLabelText("Rename project"), "Renamed Project");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("button", { name: "Rename project Renamed Project" })).toBeInTheDocument();
  });
});
