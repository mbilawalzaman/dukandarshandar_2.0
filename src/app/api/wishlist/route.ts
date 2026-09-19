import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";

let wishlistIndexes: Promise<unknown> | undefined;

function customerIdFor(auth: ReturnType<typeof requireAuth>): string | null {
  if (!auth.ok || auth.user.role === "guest" || auth.user.userId.startsWith("guest_")) return null;
  return auth.user.userId;
}

async function ensureIndexes() {
  if (!wishlistIndexes) {
    wishlistIndexes = getDb().then((db) =>
      db.collection("wishlists").createIndex({ customerId: 1, productId: 1 }, { unique: true })
    ).catch((error) => {
      wishlistIndexes = undefined;
      throw error;
    });
  }
  await wishlistIndexes;
}

export async function GET(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;
  const customerId = customerIdFor(auth);
  if (!customerId) return NextResponse.json({ success: false, message: "Log in to use your wishlist" }, { status: 403 });

  try {
    const db = await getDb();
    const items = await db.collection("wishlists").aggregate([
      { $match: { customerId } },
      { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
      { $match: { "product.status": { $ne: "inactive" } } },
      { $sort: { createdAt: -1 } },
      { $project: { _id: 0, product: 1 } },
    ]).toArray();
    return NextResponse.json({ success: true, products: items.map((item) => item.product) });
  } catch (error) {
    console.error("Wishlist GET error:", error);
    return NextResponse.json({ success: false, message: "Failed to load wishlist" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;
  const customerId = customerIdFor(auth);
  if (!customerId) return NextResponse.json({ success: false, message: "Log in to save items" }, { status: 403 });

  try {
    const { productId } = await req.json();
    if (typeof productId !== "string" || !ObjectId.isValid(productId)) {
      return NextResponse.json({ success: false, message: "Invalid product" }, { status: 400 });
    }
    const db = await getDb();
    const id = new ObjectId(productId);
    const product = await db.collection("products").findOne({ _id: id, status: { $ne: "inactive" } }, { projection: { _id: 1 } });
    if (!product) return NextResponse.json({ success: false, message: "Product is unavailable" }, { status: 404 });
    await ensureIndexes();
    await db.collection("wishlists").updateOne({ customerId, productId: id }, { $setOnInsert: { customerId, productId: id, createdAt: new Date() } }, { upsert: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Wishlist POST error:", error);
    return NextResponse.json({ success: false, message: "Failed to save item" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;
  const customerId = customerIdFor(auth);
  if (!customerId) return NextResponse.json({ success: false, message: "Log in to manage saved items" }, { status: 403 });

  try {
    const { productId } = await req.json();
    if (typeof productId !== "string" || !ObjectId.isValid(productId)) {
      return NextResponse.json({ success: false, message: "Invalid product" }, { status: 400 });
    }
    const db = await getDb();
    await db.collection("wishlists").deleteOne({ customerId, productId: new ObjectId(productId) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Wishlist DELETE error:", error);
    return NextResponse.json({ success: false, message: "Failed to remove saved item" }, { status: 500 });
  }
}
