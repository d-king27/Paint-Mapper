export const USER_PAINTS_STORAGE_KEY = "paintMapper.userData.v1";

export const EMPTY_USER_PAINTS = {
  version: 1,
  ownedPaintIds: [],
  wishlistPaintIds: [],
  updatedAt: null,
};

function uniqueIds(ids) {
  return [...new Set((ids || []).filter(Boolean))];
}

export function normalizeUserPaints(value) {
  return {
    version: 1,
    ownedPaintIds: uniqueIds(value?.ownedPaintIds),
    wishlistPaintIds: uniqueIds(value?.wishlistPaintIds).filter((id) => !value?.ownedPaintIds?.includes(id)),
    updatedAt: value?.updatedAt || null,
  };
}

export function loadUserPaints(storage = window.localStorage) {
  try {
    const raw = storage.getItem(USER_PAINTS_STORAGE_KEY);
    if (!raw) return EMPTY_USER_PAINTS;
    return normalizeUserPaints(JSON.parse(raw));
  } catch {
    return EMPTY_USER_PAINTS;
  }
}

export function saveUserPaints(userPaints, storage = window.localStorage) {
  const normalized = normalizeUserPaints({
    ...userPaints,
    updatedAt: new Date().toISOString(),
  });
  storage.setItem(USER_PAINTS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function setPaintCollectionStatus(userPaints, paintId, status) {
  const owned = new Set(userPaints.ownedPaintIds);
  const wishlist = new Set(userPaints.wishlistPaintIds);

  owned.delete(paintId);
  wishlist.delete(paintId);

  if (status === "owned") {
    owned.add(paintId);
  }

  if (status === "wishlist") {
    wishlist.add(paintId);
  }

  return {
    ...userPaints,
    ownedPaintIds: [...owned],
    wishlistPaintIds: [...wishlist],
  };
}

export function getPaintCollectionStatus(userPaints, paintId) {
  if (userPaints.ownedPaintIds.includes(paintId)) return "owned";
  if (userPaints.wishlistPaintIds.includes(paintId)) return "wishlist";
  return "none";
}

function serializePaint(paint) {
  return {
    id: paint.id,
    brandId: paint.brandId,
    brandName: paint.brandName,
    name: paint.name,
    rawText: paint.rawText,
    hex: paint.hex,
    colorId: paint.colorId,
    citationTags: paint.citationTags,
    excludedNames: paint.excludedNames,
  };
}

export function buildUserPaintExport(userPaints, paintById) {
  return {
    type: "paint-mapper-user-paints",
    version: 1,
    exportedAt: new Date().toISOString(),
    ownedPaints: userPaints.ownedPaintIds.map((id) => paintById.get(id)).filter(Boolean).map(serializePaint),
    wishlistPaints: userPaints.wishlistPaintIds.map((id) => paintById.get(id)).filter(Boolean).map(serializePaint),
  };
}

export function buildShoppingListText(userPaints, paintById) {
  const ownedPaints = userPaints.ownedPaintIds.map((id) => paintById.get(id)).filter(Boolean);
  const wishlistPaints = userPaints.wishlistPaintIds.map((id) => paintById.get(id)).filter(Boolean);
  const lines = ["Litanies of Colour Paint List", ""];

  lines.push("Owned Paints");
  lines.push(...(ownedPaints.length ? ownedPaints.map((paint) => paint.name) : ["None"]));
  lines.push("");
  lines.push("Wishlist");
  lines.push(...(wishlistPaints.length ? wishlistPaints.map((paint) => paint.name) : ["None"]));

  return lines.join("\n");
}
