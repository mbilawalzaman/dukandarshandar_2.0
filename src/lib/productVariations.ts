import type { ProductVariation } from "@/types/apps/productTypes";

/** Validate catalog input without coercing malformed stock values. */
export function normalizeProductVariations(value: unknown): ProductVariation[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 50)
    throw new Error("Use at most 50 product variations");
  const ids = new Set<string>();
  const names = new Set<string>();

  const variations = value.map((entry: unknown): ProductVariation => {
    if (!entry || typeof entry !== "object")
      throw new Error("Invalid product variation");
    const variation = entry as Record<string, unknown>;

    if (
      typeof variation.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,64}$/.test(variation.id) ||
      typeof variation.name !== "string" ||
      !variation.name.trim() ||
      variation.name.trim().length > 60 ||
      typeof variation.quantity !== "number" ||
      !Number.isSafeInteger(variation.quantity) ||
      variation.quantity < 0
    )
      throw new Error(
        "Each variation needs a name and nonnegative whole stock quantity",
      );
    const name = variation.name.trim();

    if (ids.has(variation.id) || names.has(name.toLowerCase()))
      throw new Error("Product variations must be unique");
    ids.add(variation.id);
    names.add(name.toLowerCase());

    return { id: variation.id, name, quantity: variation.quantity };
  });

  if (
    !Number.isSafeInteger(
      variations.reduce((sum, variation) => sum + variation.quantity, 0),
    )
  )
    throw new Error("Total variation stock is too large");

  return variations;
}

export function cartLineKey(item: {
  _id: string;
  variationId?: string;
}): string {
  return item.variationId ? `${item._id}:${item.variationId}` : item._id;
}
