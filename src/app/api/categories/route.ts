import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  createProductCategory,
  listProductCategories,
  normalizeCategoryName,
} from "@/services/categoryService";
import type {
  CategoryCreateResponse,
  CategoryErrorResponse,
  CategoryListResponse,
} from "@/types/apps/categoryTypes";

export async function GET(
  req: Request,
): Promise<NextResponse<CategoryListResponse | CategoryErrorResponse>> {
  const params = new URL(req.url).searchParams;
  const limit = Number(params.get("limit") ?? 100);

  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    return NextResponse.json(
      { success: false, message: "Limit must be between 1 and 200" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await listProductCategories(params.get("cursor"), limit),
    );
  } catch (error) {
    console.error("Failed to fetch categories:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load categories" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
): Promise<
  NextResponse<
    | CategoryCreateResponse
    | CategoryErrorResponse
    | { success: boolean; error: string }
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

  const name = normalizeCategoryName(
    typeof body === "object" && body !== null && "name" in body
      ? body.name
      : null,
  );

  if (name === null) {
    return NextResponse.json(
      {
        success: false,
        message: "Enter a category name between 1 and 80 characters",
      },
      { status: 400 },
    );
  }

  try {
    const created = await createProductCategory(name);

    if (!created)
      return NextResponse.json(
        { success: false, message: "Category already exists" },
        { status: 409 },
      );

    return NextResponse.json({ success: true, name }, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);

    return NextResponse.json(
      { success: false, message: "Unable to create category" },
      { status: 500 },
    );
  }
}
