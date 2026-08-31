import { NextRequest, NextResponse } from "next/server";
import { getProductByID, deleteProduct, updateProduct } from "@/controllers/productController";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const response = await getProductByID(id);
    return NextResponse.json(
      { success: response.success, message: response.message, product: response.product || null },
      { status: response.status }
    );
  } catch (error) {
    console.error("Error in GET handler:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch product" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = requireAdmin(req);
    if (!admin.ok) return admin.response;

    const { id } = await context.params;
    const response = await deleteProduct(id);
    return NextResponse.json({ success: response.success, message: response.message }, { status: response.status });
  } catch (error) {
    console.error("Error in DELETE handler:", error);
    return NextResponse.json({ success: false, message: "Failed to delete product" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = requireAdmin(req);
    if (!admin.ok) return admin.response;

    const { id } = await context.params;
    const body = await req.json();
    const reqWithId = new Request(req.url, {
      method: "PUT",
      body: JSON.stringify({ _id: id, ...body }),
      headers: req.headers,
    });
    return await updateProduct(reqWithId);
  } catch (error) {
    console.error("Error in PUT handler:", error);
    return NextResponse.json({ success: false, message: "Failed to update product" }, { status: 500 });
  }
}
