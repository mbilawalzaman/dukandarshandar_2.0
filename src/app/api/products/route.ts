import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { fetchProductsPaginated } from "@/controllers/productController";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "9", 10);
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  const result = await fetchProductsPaginated({
    page,
    limit,
    search: searchParams.get("search") || undefined,
    category: searchParams.get("category") || undefined,
    minPrice: minPrice !== null && minPrice !== "" ? Number(minPrice) : undefined,
    maxPrice: maxPrice !== null && maxPrice !== "" ? Number(maxPrice) : undefined,
    inStockOnly: searchParams.get("inStockOnly") === "true",
    sortBy: searchParams.get("sortBy") || undefined,
    stock: searchParams.get("stock") || undefined,
  });

  if (!result.success) {
    return NextResponse.json({ success: false, message: result.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    products: result.products,
    pagination: result.pagination,
    categoryCounts: result.categoryCounts,
    stockCounts: result.stockCounts,
  });
}
