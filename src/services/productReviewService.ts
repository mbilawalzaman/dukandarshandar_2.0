import { ObjectId, type WithId, type Document } from "mongodb";
import { getDb } from "@/lib/db";

const COLLECTION = "product_reviews";
const MAX_COMMENT = 1000;

export type ReviewDoc = {
  productId: ObjectId;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
};

function serialize(doc: WithId<Document> | (ReviewDoc & { _id: ObjectId })) {
  const d = doc as WithId<Document>;
  return {
    _id: String(d._id),
    productId: String(d.productId),
    userId: String(d.userId),
    userName: String(d.userName || "Customer"),
    rating: Number(d.rating) || 0,
    comment: String(d.comment || ""),
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt || ""),
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : String(d.updatedAt || ""),
  };
}

/** True when the user has at least one delivered order that includes this product. */
export async function userHasDeliveredProduct(userId: string, productId: string): Promise<boolean> {
  if (!userId || userId === "guest" || userId.startsWith("guest_") || !ObjectId.isValid(productId)) return false;

  const db = await getDb();
  const oid = new ObjectId(productId);

  const order = await db.collection("orders").findOne(
    {
      status: "delivered",
      customer_id: userId,
      $or: [{ "items._id": productId }, { "items._id": oid }],
    },
    { projection: { _id: 1 } }
  );

  return Boolean(order);
}

async function recalculateProductRating(productId: ObjectId) {
  const db = await getDb();
  const reviews = await db
    .collection(COLLECTION)
    .find({ productId })
    .project({ rating: 1 })
    .toArray();

  const ratings = reviews
    .map((r) => Number(r.rating))
    .filter((r) => Number.isFinite(r) && r >= 0.5 && r <= 5);

  const average =
    ratings.length === 0
      ? 0
      : Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 2) / 2;

  await db.collection("products").updateOne(
    { _id: productId },
    {
      $set: {
        rating: average,
        ratings,
        reviewCount: ratings.length,
        updated_at: new Date(),
      },
    }
  );

  return { average, count: ratings.length, ratings };
}

export async function listProductReviews(productId: string, userId?: string) {
  if (!ObjectId.isValid(productId)) {
    return { success: false as const, message: "Invalid product ID", status: 400 };
  }

  const db = await getDb();
  const oid = new ObjectId(productId);
  const product = await db.collection("products").findOne({ _id: oid }, { projection: { _id: 1, rating: 1 } });
  if (!product) {
    return { success: false as const, message: "Product not found", status: 404 };
  }

  const docs = await db
    .collection(COLLECTION)
    .find({ productId: oid })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const reviews = docs.map(serialize);
  const myReview = userId ? reviews.find((r) => r.userId === userId) || null : null;
  const canReview = userId ? await userHasDeliveredProduct(userId, productId) : false;

  return {
    success: true as const,
    status: 200,
    reviews,
    myReview,
    canReview,
    averageRating: Number(product.rating) || 0,
    reviewCount: reviews.length,
  };
}

export async function upsertProductReview(input: {
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
}) {
  const { productId, userId, userName } = input;

  if (!ObjectId.isValid(productId)) {
    return { success: false as const, message: "Invalid product ID", status: 400 };
  }

  if (userId === "guest" || userId.startsWith("guest_")) {
    return { success: false as const, message: "Guests cannot leave reviews. Please log in.", status: 403 };
  }

  if (typeof input.rating !== "number" || Number.isNaN(input.rating) || input.rating < 0.5 || input.rating > 5) {
    return { success: false as const, message: "Rating must be between 0.5 and 5", status: 400 };
  }

  const eligible = await userHasDeliveredProduct(userId, productId);
  if (!eligible) {
    return {
      success: false as const,
      message: "You can only review products from orders that have been delivered.",
      status: 403,
    };
  }

  const rating = Math.round(input.rating * 2) / 2;
  const comment = String(input.comment || "").trim().slice(0, MAX_COMMENT);

  const db = await getDb();
  const oid = new ObjectId(productId);
  const product = await db.collection("products").findOne({ _id: oid }, { projection: { _id: 1 } });
  if (!product) {
    return { success: false as const, message: "Product not found", status: 404 };
  }

  const now = new Date();
  const existing = await db.collection(COLLECTION).findOne({ productId: oid, userId });

  if (existing) {
    await db.collection(COLLECTION).updateOne(
      { _id: existing._id },
      {
        $set: {
          rating,
          comment,
          userName: userName || existing.userName || "Customer",
          updatedAt: now,
        },
      }
    );
  } else {
    await db.collection(COLLECTION).insertOne({
      productId: oid,
      userId,
      userName: userName || "Customer",
      rating,
      comment,
      createdAt: now,
      updatedAt: now,
    });
  }

  const stats = await recalculateProductRating(oid);
  const listed = await listProductReviews(productId, userId);

  return {
    success: true as const,
    status: 200,
    message: existing ? "Review updated" : "Review submitted",
    myReview: listed.success ? listed.myReview : null,
    reviews: listed.success ? listed.reviews : [],
    canReview: listed.success ? listed.canReview : true,
    averageRating: stats.average,
    reviewCount: stats.count,
  };
}
