import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  createProductCategory,
  deleteProductCategory,
  listProductCategories,
  listProductCategoriesWithDetails,
  normalizeCategoryName,
  updateProductCategory,
} from "@/services/categoryService";
import type {
  CategoryCreateResponse,
  CategoryErrorResponse,
  CategoryListResponse,
  CategoryMutationResponse,
} from "@/types/apps/categoryTypes";

/**
 * Controller: Handles GET /api/categories
 * Supports cursor pagination or detailed category listing with product counts.
 */
export async function getCategories(
  req: Request,
): Promise<NextResponse<CategoryListResponse | CategoryErrorResponse>> {
  const url = new URL(req.url);
  const params = url.searchParams;
  const details = params.get("details") === "true";
  const search = params.get("search") || undefined;
  const limit = Number(params.get("limit") ?? 100);

  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    return NextResponse.json(
      { success: false, message: "Limit must be between 1 and 200" },
      { status: 400 },
    );
  }

  try {
    if (details) {
      const result = await listProductCategoriesWithDetails(search);

      return NextResponse.json({
        success: true,
        categories: result.categories,
        categoryDetails: result.categoryDetails,
        total: result.total,
        nextCursor: null,
      });
    }

    const result = await listProductCategories(params.get("cursor"), limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch categories:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load categories" },
      { status: 500 },
    );
  }
}

/**
 * Controller: Handles POST /api/categories
 * Creates a new product category. Requires admin role.
 */
export async function createCategory(
  req: Request,
): Promise<
  NextResponse<
    CategoryCreateResponse | CategoryErrorResponse | CategoryMutationResponse
  >
> {
  const auth = requireAdmin(req);

  if (!auth.ok) return auth.response;

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const rawName =
    typeof body === "object" && body !== null && "name" in body
      ? (body as { name?: unknown }).name
      : null;

  const rawActive =
    typeof body === "object" && body !== null && "isActive" in body
      ? (body as { isActive?: unknown }).isActive
      : true;

  const name = normalizeCategoryName(rawName);

  if (name === null) {
    return NextResponse.json(
      {
        success: false,
        message: "Enter a category name between 1 and 80 characters",
      },
      { status: 400 },
    );
  }

  const isActive = typeof rawActive === "boolean" ? rawActive : true;

  try {
    const result = await createProductCategory(name, isActive);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message || "Category already exists",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        name,
        category: result.category,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create category:", error);

    return NextResponse.json(
      { success: false, message: "Unable to create category" },
      { status: 500 },
    );
  }
}

/**
 * Controller: Handles PUT /api/categories
 * Renames or updates an existing category. Requires admin role.
 */
export async function updateCategory(
  req: Request,
): Promise<NextResponse<CategoryMutationResponse | CategoryErrorResponse>> {
  const auth = requireAdmin(req);

  if (!auth.ok) return auth.response;

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { success: false, message: "Missing request parameters" },
      { status: 400 },
    );
  }

  const { oldName, newName, isActive } = body as {
    oldName?: unknown;
    newName?: unknown;
    isActive?: unknown;
  };

  if (typeof oldName !== "string" || !oldName.trim()) {
    return NextResponse.json(
      { success: false, message: "Old category name is required" },
      { status: 400 },
    );
  }

  if (typeof newName !== "string" || !newName.trim()) {
    return NextResponse.json(
      { success: false, message: "New category name is required" },
      { status: 400 },
    );
  }

  const activeVal = typeof isActive === "boolean" ? isActive : undefined;

  try {
    const result = await updateProductCategory(
      oldName.trim(),
      newName.trim(),
      activeVal,
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message || "Failed to update category",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      name: result.category?.name || newName.trim(),
      category: result.category,
      productsAffected: result.productsAffected,
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("Failed to update category:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update category" },
      { status: 500 },
    );
  }
}

/**
 * Controller: Handles DELETE /api/categories
 * Deletes a category by name. Requires admin role.
 */
export async function deleteCategory(
  req: Request,
): Promise<NextResponse<CategoryMutationResponse | CategoryErrorResponse>> {
  const auth = requireAdmin(req);

  if (!auth.ok) return auth.response;

  let nameToDelete: string | null = null;

  const url = new URL(req.url);
  const queryName = url.searchParams.get("name");

  if (queryName && queryName.trim()) {
    nameToDelete = queryName.trim();
  } else {
    try {
      const body = (await req.json()) as { name?: unknown };

      if (typeof body?.name === "string" && body.name.trim()) {
        nameToDelete = body.name.trim();
      }
    } catch {
      // Body not provided or not JSON, query param fallback
    }
  }

  if (!nameToDelete) {
    return NextResponse.json(
      { success: false, message: "Category name is required" },
      { status: 400 },
    );
  }

  try {
    const result = await deleteProductCategory(nameToDelete);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message || "Failed to delete category",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message || "Category deleted successfully",
      productsAffected: result.productsAffected,
    });
  } catch (error) {
    console.error("Failed to delete category:", error);

    return NextResponse.json(
      { success: false, message: "Unable to delete category" },
      { status: 500 },
    );
  }
}
