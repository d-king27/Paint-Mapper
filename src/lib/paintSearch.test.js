import { describe, expect, it } from "vitest";
import { filterPaints, getAvailableTags, getPaintTags, scorePaint } from "./paintSearch";
import { paintDataFixture } from "../test/fixtures/paintData";

describe("paint search helpers", () => {
  it("prioritizes exact paint name matches", () => {
    const results = filterPaints(paintDataFixture, { query: "Mephiston Red" });

    expect(results[0].name).toBe("Mephiston Red");
  });

  it("matches partial paint names", () => {
    const results = filterPaints(paintDataFixture, { query: "meph" });

    expect(results.map((paint) => paint.name)).toContain("Mephiston Red");
  });

  it("matches brand names", () => {
    const results = filterPaints(paintDataFixture, { query: "Vallejo" });

    expect(results.map((paint) => paint.brandName)).toContain("Vallejo Game Color");
  });

  it("matches hex values", () => {
    const results = filterPaints(paintDataFixture, { query: "#FFF700" });

    expect(results.map((paint) => paint.name)).toContain("Dorn Yellow");
  });

  it("matches readable citation labels when the tag is visible", () => {
    const results = filterPaints(paintDataFixture, { query: "approximate" });

    expect(results.map((paint) => paint.name)).toContain("Dorn Yellow");
  });

  it("returns no starter results before a search is entered", () => {
    const results = filterPaints(paintDataFixture);

    expect(results).toEqual([]);
  });

  it("excludes paints with hidden tags", () => {
    const results = filterPaints(paintDataFixture, { query: "Red", hiddenTags: ["1"] });

    expect(results.map((paint) => paint.name)).toContain("Mephiston Red");
    expect(results.map((paint) => paint.name)).not.toContain("Mechrite Red");
  });

  it("returns available tags used by paint entries", () => {
    expect(getAvailableTags(paintDataFixture)).toEqual(["1", "2", "struckThroughPaintName"]);
  });

  it("adds a tested non-match tag for struck-through source paints", () => {
    const paint = paintDataFixture.paints.find((item) => item.excludedNames.length);

    expect(getPaintTags(paint)).toContain("struckThroughPaintName");
  });

  it("scores exact matches above broad brand matches", () => {
    const exact = paintDataFixture.paints.find((paint) => paint.name === "Mephiston Red");
    const brandOnly = paintDataFixture.paints.find((paint) => paint.name === "Heavy Red (141)");

    expect(scorePaint(exact, "mephiston red", paintDataFixture.citations)).toBeGreaterThan(
      scorePaint(brandOnly, "vallejo", paintDataFixture.citations),
    );
  });
});
