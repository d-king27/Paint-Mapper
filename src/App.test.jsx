import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { paintDataFixture } from "./test/fixtures/paintData";

describe("App", () => {
  it("searches paints and shows listed equivalents without empty brand cards", async () => {
    const user = userEvent.setup();
    render(<App data={paintDataFixture} />);

    await user.type(screen.getByLabelText("Search by paint, brand, note, or hex"), "Mephiston Red");

    expect(await screen.findByRole("heading", { name: "Mephiston Red" })).toBeInTheDocument();
    expect(screen.getByText("1 paint")).toBeInTheDocument();
    expect(screen.getByText("2 listed matches")).toBeInTheDocument();
    expect(screen.getByText("Heavy Red (141)")).toBeInTheDocument();
    expect(document.querySelectorAll(".equivalent-swatch")).toHaveLength(2);
    expect(screen.queryByText("Mechrite Red")).not.toBeInTheDocument();
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

  it("hides and reveals results by tag filter", async () => {
    const user = userEvent.setup();
    render(<App data={paintDataFixture} />);

    await user.type(screen.getByLabelText("Search by paint, brand, note, or hex"), "Mechrite Red");

    expect(screen.queryByText("Mechrite Red")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "discontinued" }));

    expect(screen.getAllByText("Mechrite Red").length).toBeGreaterThan(0);
    expect(screen.getAllByText("discontinued").length).toBeGreaterThan(0);
  });
});
