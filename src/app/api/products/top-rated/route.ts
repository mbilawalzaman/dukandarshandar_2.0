import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getTopRatedProducts } from "@/controllers/productController";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit")) || 8;
    const products = await getTopRatedProducts(limit);
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching top-rated products:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch top products" }, { status: 500 });
  }
}
