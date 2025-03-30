import { NextResponse } from "next/server";
import { getTopRatedProducts } from "@/controllers/productController";

export async function GET() {
  try {
    const products = await getTopRatedProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error adding product:", error);
    return NextResponse.json({ success: false, message: "Failed to create product" }, { status: 500 });
  }
}
