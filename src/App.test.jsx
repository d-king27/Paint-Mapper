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
    expect(screen.getByText("3 listed matches")).toBeInTheDocument();
    expect(screen.getByText("Heavy Red (141)")).toBeInTheDocument();
    expect(screen.queryByText("No listed match")).not.toBeInTheDocument();
  });

  it("renders readable note labels on paint results", async () => {
    const user = userEvent.setup();
    render(<App data={paintDataFixture} />);

    await user.type(screen.getByLabelText("Search by paint, brand, note, or hex"), "Dorn Yellow");

    const results = screen.getByRole("list");
    expect(within(results).getByText("approximate")).toBeInTheDocument();
  });
});
