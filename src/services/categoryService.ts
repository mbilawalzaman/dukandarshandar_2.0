import { getDb } from "@/lib/db";
import type {
  CategoryListResponse,
  ProductCategoryDocument,
} from "@/types/apps/categoryTypes";

export function normalizeCategoryName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");

  return name.length > 0 && name.length <= 80 ? name : null;
}

export async function listProductCategories(
  cursor: string | null,
  limit: number,
): Promise<CategoryListResponse> {
  const db = await getDb();

  const rows = await db
    .collection<ProductCategoryDocument>("productCategories")
    .find(cursor === null ? {} : { _id: { $gt: cursor } }, {
      projection: { _id: 1, name: 1 },
    })
    .sort({ _id: 1 })
    .limit(limit + 1)
    .toArray();

  const page = rows.slice(0, limit);

  return {
    success: true,
    categories: page.map((category) => category.name),
    nextCursor:
      rows.length > limit ? (page[page.length - 1]?._id ?? null) : null,
  };
}

export async function createProductCategory(name: string): Promise<boolean> {
  const db = await getDb();

  try {
    const result = await db
      .collection<ProductCategoryDocument>("productCategories")
      .updateOne(
        { _id: name.toLowerCase() },
        { $setOnInsert: { name, createdAt: new Date() } },
        { upsert: true },
      );

    return result.upsertedCount === 1;
  } catch (error) {
    // Concurrent upserts can lose the unique-key race.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    )
      return false;
    throw error;
  }
}
