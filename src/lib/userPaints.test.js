import { describe, expect, it, vi } from "vitest";
import {
  buildShoppingListText,
  EMPTY_USER_PAINTS,
  getPaintCollectionStatus,
  loadUserPaints,
  saveUserPaints,
  setPaintCollectionStatus,
  USER_PAINTS_STORAGE_KEY,
} from "./userPaints";
import { paintDataFixture } from "../test/fixtures/paintData";

function createStorage() {
  const store = new Map();
  return {
    getItem: vi.fn((key) => store.get(key) || null),
    setItem: vi.fn((key, value) => store.set(key, value)),
  };
}

describe("user paint storage", () => {
  it("loads an empty user paint collection when storage has no data", () => {
    expect(loadUserPaints(createStorage())).toEqual(EMPTY_USER_PAINTS);
  });

  it("saves normalized user paint data with a timestamp", () => {
    const storage = createStorage();
    const saved = saveUserPaints(
      {
        ownedPaintIds: ["paint-a", "paint-a"],
        wishlistPaintIds: ["paint-a", "paint-b"],
      },
      storage,
    );

    expect(saved.ownedPaintIds).toEqual(["paint-a"]);
    expect(saved.wishlistPaintIds).toEqual(["paint-b"]);
    expect(saved.updatedAt).toEqual(expect.any(String));
    expect(storage.setItem).toHaveBeenCalledWith(USER_PAINTS_STORAGE_KEY, JSON.stringify(saved));
  });

  it("keeps owned and wishlist paint states mutually exclusive", () => {
    const wishlisted = setPaintCollectionStatus(EMPTY_USER_PAINTS, "paint-a", "wishlist");
    const owned = setPaintCollectionStatus(wishlisted, "paint-a", "owned");

    expect(getPaintCollectionStatus(owned, "paint-a")).toBe("owned");
    expect(owned.wishlistPaintIds).toEqual([]);
  });

  it("builds a plain text shopping list", () => {
    const paintById = new Map(paintDataFixture.paints.map((paint) => [paint.id, paint]));
    const text = buildShoppingListText(
      {
        ownedPaintIds: ["paint-new-citadel-mephiston-red-991115-1"],
        wishlistPaintIds: ["paint-vallejo-game-color-heavy-red-141-991115-1"],
      },
      paintById,
    );

    expect(text).toContain("Litanies of Colour Paint List");
    expect(text).toContain("Owned Paints\nMephiston Red");
    expect(text).toContain("Wishlist\nHeavy Red (141)");
  });
});
