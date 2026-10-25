import { getDb } from "@/lib/db";
import { escapeRegex } from "@/lib/escapeRegex";
import type {
  CategoryDetailItem,
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
      projection: { _id: 1, name: 1, isActive: 1, createdAt: 1 },
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

export async function listProductCategoriesWithDetails(
  search?: string,
): Promise<{
  categories: string[];
  categoryDetails: CategoryDetailItem[];
  total: number;
}> {
  const db = await getDb();

  const [categories, productCounts] = await Promise.all([
    db
      .collection<ProductCategoryDocument>("productCategories")
      .find({})
      .sort({ name: 1 })
      .toArray(),
    db
      .collection("products")
      .aggregate<{ _id: string | null; count: number }>([
        { $match: { deleted_at: { $exists: false } } },
        {
          $group: {
            _id: { $toLower: "$category" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
  ]);

  const countMap = new Map<string, number>();

  productCounts.forEach((p) => {
    if (p._id) {
      countMap.set(p._id, p.count);
    }
  });

  let details: CategoryDetailItem[] = categories.map((cat) => ({
    id: cat._id,
    name: cat.name,
    productCount: countMap.get(cat._id) ?? 0,
    isActive: cat.isActive !== false,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  }));

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();

    details = details.filter((item) => item.name.toLowerCase().includes(s));
  }

  return {
    categories: categories.map((c) => c.name),
    categoryDetails: details,
    total: details.length,
  };
}

export async function createProductCategory(
  name: string,
  isActive = true,
): Promise<{
  success: boolean;
  category?: CategoryDetailItem;
  message?: string;
}> {
  const db = await getDb();
  const normalizedId = name.toLowerCase();

  const existing = await db
    .collection<ProductCategoryDocument>("productCategories")
    .findOne({ _id: normalizedId });

  if (existing) {
    return { success: false, message: "Category already exists" };
  }

  const now = new Date();

  const doc: ProductCategoryDocument = {
    _id: normalizedId,
    name,
    isActive,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db
      .collection<ProductCategoryDocument>("productCategories")
      .insertOne(doc);

    return {
      success: true,
      category: {
        id: doc._id,
        name: doc.name,
        productCount: 0,
        isActive: doc.isActive ?? true,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return { success: false, message: "Category already exists" };
    }

    throw error;
  }
}

export async function updateProductCategory(
  oldName: string,
  newName: string,
  isActive?: boolean,
): Promise<{
  success: boolean;
  category?: CategoryDetailItem;
  message?: string;
  productsAffected: number;
}> {
  const db = await getDb();
  const oldId = oldName.trim().toLowerCase();
  const newNormalized = normalizeCategoryName(newName);

  if (!newNormalized) {
    return {
      success: false,
      message: "Category name must be between 1 and 80 characters",
      productsAffected: 0,
    };
  }

  const newId = newNormalized.toLowerCase();

  const existing = await db
    .collection<ProductCategoryDocument>("productCategories")
    .findOne({ _id: oldId });

  if (!existing) {
    return {
      success: false,
      message: `Category "${oldName}" not found`,
      productsAffected: 0,
    };
  }

  const now = new Date();

  const nextActive =
    isActive !== undefined ? isActive : (existing.isActive ?? true);

  if (newId !== oldId) {
    const clash = await db
      .collection<ProductCategoryDocument>("productCategories")
      .findOne({ _id: newId });

    if (clash) {
      return {
        success: false,
        message: `Category "${newNormalized}" already exists`,
        productsAffected: 0,
      };
    }

    await db
      .collection<ProductCategoryDocument>("productCategories")
      .insertOne({
        _id: newId,
        name: newNormalized,
        isActive: nextActive,
        createdAt: existing.createdAt ?? now,
        updatedAt: now,
      });

    await db
      .collection<ProductCategoryDocument>("productCategories")
      .deleteOne({ _id: oldId });

    const updateRes = await db.collection("products").updateMany(
      {
        category: {
          $regex: new RegExp(`^${escapeRegex(existing.name)}$`, "i"),
        },
      },
      { $set: { category: newNormalized, updated_at: now } },
    );

    const productCount = await db.collection("products").countDocuments({
      category: {
        $regex: new RegExp(`^${escapeRegex(newNormalized)}$`, "i"),
      },
      deleted_at: { $exists: false },
    });

    return {
      success: true,
      category: {
        id: newId,
        name: newNormalized,
        productCount,
        isActive: nextActive,
        updatedAt: now,
      },
      productsAffected: updateRes.modifiedCount,
    };
  }

  await db
    .collection<ProductCategoryDocument>("productCategories")
    .updateOne(
      { _id: oldId },
      { $set: { name: newNormalized, isActive: nextActive, updatedAt: now } },
    );

  let modified = 0;

  if (existing.name !== newNormalized) {
    const updateRes = await db.collection("products").updateMany(
      {
        category: {
          $regex: new RegExp(`^${escapeRegex(existing.name)}$`, "i"),
        },
      },
      { $set: { category: newNormalized, updated_at: now } },
    );

    modified = updateRes.modifiedCount;
  }

  const productCount = await db.collection("products").countDocuments({
    category: {
      $regex: new RegExp(`^${escapeRegex(newNormalized)}$`, "i"),
    },
    deleted_at: { $exists: false },
  });

  return {
    success: true,
    category: {
      id: oldId,
      name: newNormalized,
      productCount,
      isActive: nextActive,
      updatedAt: now,
    },
    productsAffected: modified,
  };
}

export async function deleteProductCategory(name: string): Promise<{
  success: boolean;
  message?: string;
  productsAffected: number;
}> {
  const db = await getDb();
  const id = name.trim().toLowerCase();

  const existing = await db
    .collection<ProductCategoryDocument>("productCategories")
    .findOne({ _id: id });

  if (!existing) {
    return {
      success: false,
      message: `Category "${name}" not found`,
      productsAffected: 0,
    };
  }

  const productsCount = await db.collection("products").countDocuments({
    category: {
      $regex: new RegExp(`^${escapeRegex(existing.name)}$`, "i"),
    },
    deleted_at: { $exists: false },
  });

  await db
    .collection<ProductCategoryDocument>("productCategories")
    .deleteOne({ _id: id });

  return {
    success: true,
    message: `Category "${existing.name}" deleted successfully`,
    productsAffected: productsCount,
  };
}
