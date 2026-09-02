import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { uploadImage, deleteImage } from "@/lib/cloudinary";
import { getAuthUser } from "@/lib/auth";
import type { PaymentBreakdownPoint } from "@/types/admin";
import type { ProductImage } from "@/lib/productImages";
import { MAX_PRODUCT_IMAGES } from "@/lib/productImages";

type StoredProductImage = { url: string; publicId: string };

function getStoredImages(product: Record<string, unknown>): StoredProductImage[] {
  const images = product.images as ProductImage[] | undefined;
  if (Array.isArray(images) && images.length > 0) {
    return images.map((img) => ({ url: img.url, publicId: img.publicId || "" }));
  }
  const url = product.image as string | undefined;
  const publicId = product.image_public_id as string | undefined;
  if (url) return [{ url, publicId: publicId || "" }];
  return [];
}

async function resolveImagesInput(
  input: string[],
  existing: StoredProductImage[] = []
): Promise<StoredProductImage[]> {
  const existingByUrl = new Map(existing.map((img) => [img.url, img]));
  const result: StoredProductImage[] = [];

  for (const item of input.slice(0, MAX_PRODUCT_IMAGES)) {
    if (!item?.trim()) continue;
    if (item.startsWith("data:")) {
      const uploaded = await uploadImage(item);
      result.push({ url: uploaded.url, publicId: uploaded.publicId });
    } else if (item.startsWith("http")) {
      const prev = existingByUrl.get(item);
      result.push(prev ?? { url: item, publicId: "" });
    }
  }

  return result;
}

async function deleteRemovedImages(previous: StoredProductImage[], next: StoredProductImage[]) {
  const nextUrls = new Set(next.map((img) => img.url));
  for (const img of previous) {
    if (!nextUrls.has(img.url) && img.publicId) {
      await deleteImage(img.publicId);
    }
  }
}

function syncPrimaryImageFields(images: StoredProductImage[]) {
  return {
    images,
    image: images[0]?.url ?? "",
    image_public_id: images[0]?.publicId ?? "",
  };
}

export const createProduct = async (req: Request) => {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { name, category, price, quantity, description, rating, image, images, featured, created_by } =
      await req.json();

    const imageInputs: string[] = Array.isArray(images) && images.length > 0 ? images : image ? [image] : [];

    if (!name || !category || !price || quantity === undefined || !imageInputs.length || !description) {
      return NextResponse.json({ success: false, message: "All fields are required" }, { status: 400 });
    }

    const db = await getDb();
    const storedImages = await resolveImagesInput(imageInputs);
    if (!storedImages.length) {
      return NextResponse.json({ success: false, message: "At least one valid image is required" }, { status: 400 });
    }

    const newProduct = {
      name,
      category,
      price: Number(price),
      quantity: Number(quantity),
      rating: rating || 0,
      ratings: rating ? [rating] : [],
      description,
      ...syncPrimaryImageFields(storedImages),
      featured: Boolean(featured),
      status: "active",
      created_by: created_by || user.userName,
      updated_by: user.userName,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("products").insertOne(newProduct);
    const insertedProduct = await db.collection("products").findOne({ _id: result.insertedId });

    return NextResponse.json({
      success: true,
      message: "Product created successfully",
      product: insertedProduct,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    const message = error instanceof Error ? error.message : "Failed to create product";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
};

export const updateProduct = async (req: Request) => {
  try {
    const { _id, rating, image, images, ...updateFields } = await req.json();

    if (!_id) {
      return NextResponse.json({ success: false, message: "Product ID is required" }, { status: 400 });
    }

    if (!ObjectId.isValid(_id)) {
      return NextResponse.json({ success: false, message: "Invalid Product ID format" }, { status: 400 });
    }

    const db = await getDb();
    const product = await db.collection("products").findOne({ _id: new ObjectId(_id) });

    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    const updateQuery: { $set: Record<string, unknown> } = { $set: { ...updateFields, updated_at: new Date() } };
    const existingImages = getStoredImages(product);

    if (Array.isArray(images)) {
      const storedImages = await resolveImagesInput(images, existingImages);
      if (!storedImages.length) {
        return NextResponse.json({ success: false, message: "At least one product image is required" }, { status: 400 });
      }
      await deleteRemovedImages(existingImages, storedImages);
      Object.assign(updateQuery.$set, syncPrimaryImageFields(storedImages));
    } else if (image && (image.startsWith("data:") || (image.startsWith("http") && image !== product.image))) {
      const storedImages = await resolveImagesInput([image], existingImages);
      await deleteRemovedImages(existingImages, storedImages);
      Object.assign(updateQuery.$set, syncPrimaryImageFields(storedImages));
    }

    if (rating !== undefined) {
      const ratings = product.ratings || [];
      ratings.push(rating);
      const newAverageRating =
        Math.round((ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length) * 2) / 2;
      updateQuery.$set.rating = newAverageRating;
      updateQuery.$set.ratings = ratings;
    }

    const updateResult = await db.collection("products").updateOne({ _id: new ObjectId(_id) }, updateQuery);

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json({ success: false, message: "No changes were made" }, { status: 400 });
    }

    const updatedProduct = await db.collection("products").findOne({ _id: new ObjectId(_id) });
    return NextResponse.json({ success: true, message: "Product updated successfully", product: updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
};

export const getProductByID = async (id: string) => {
  try {
    if (!id || !ObjectId.isValid(id)) {
      return { success: false, message: "Invalid product ID", status: 400 };
    }

    const db = await getDb();
    const product = await db.collection("products").findOne({ _id: new ObjectId(id) });

    if (!product) {
      return { success: false, message: "Product not found", status: 404 };
    }

    return { success: true, product, status: 200 };
  } catch (error) {
    console.error("Error fetching product:", error);
    return { success: false, message: "Failed to fetch product", status: 500 };
  }
};

export const fetchProducts = async () => {
  try {
    const db = await getDb();
    const products = await db.collection("products").find({}).sort({ created_at: -1 }).toArray();
    return { success: true, products };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { success: false, message: "Failed to fetch products" };
  }
};

type ProductQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sortBy?: string;
  stock?: string;
};

function buildProductFilter(options: ProductQueryOptions) {
  const filter: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];

  if (options.search?.trim()) {
    const q = options.search.trim();
    and.push({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    });
  }

  if (options.category && options.category !== "all") {
    and.push({ category: { $regex: new RegExp(`^${options.category}$`, "i") } });
  }

  if (options.minPrice !== undefined && !Number.isNaN(options.minPrice)) {
    and.push({ price: { $gte: options.minPrice } });
  }
  if (options.maxPrice !== undefined && !Number.isNaN(options.maxPrice)) {
    and.push({ price: { $lte: options.maxPrice } });
  }
  if (options.inStockOnly) {
    and.push({ quantity: { $gt: 0 } });
  }

  switch (options.stock) {
    case "in-stock":
      and.push({ quantity: { $gt: 5 } });
      break;
    case "low-stock":
      and.push({ quantity: { $gt: 0, $lte: 5 } });
      break;
    case "out-of-stock":
      and.push({ quantity: { $lte: 0 } });
      break;
  }

  if (and.length === 1) Object.assign(filter, and[0]);
  else if (and.length > 1) filter.$and = and;

  return filter;
}

function productSort(sortBy?: string): Record<string, 1 | -1> {
  switch (sortBy) {
    case "price-asc":
      return { price: 1 };
    case "price-desc":
      return { price: -1 };
    case "rating-desc":
      return { rating: -1 };
    case "name-asc":
      return { name: 1 };
    default:
      return { created_at: -1 };
  }
}

export const fetchProductsPaginated = async (options: ProductQueryOptions = {}) => {
  try {
    const db = await getDb();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(48, Math.max(1, options.limit || 9));
    const skip = (page - 1) * limit;
    const filter = buildProductFilter(options);
    const sort = productSort(options.sortBy);

    const [products, total, categoryAgg, inStockCount, lowStockCount, outOfStockCount] = await Promise.all([
      db.collection("products").find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      db.collection("products").countDocuments(filter),
      db.collection("products").aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]).toArray(),
      db.collection("products").countDocuments({ quantity: { $gt: 5 } }),
      db.collection("products").countDocuments({ quantity: { $gt: 0, $lte: 5 } }),
      db.collection("products").countDocuments({ quantity: { $lte: 0 } }),
    ]);

    const categoryCounts: Record<string, number> = { all: 0 };
    categoryAgg.forEach((row) => {
      const cat = String(row._id || "Uncategorized");
      categoryCounts[cat] = row.count as number;
      categoryCounts.all += row.count as number;
    });

    return {
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: page * limit < total,
      },
      categoryCounts,
      stockCounts: { inStock: inStockCount, lowStock: lowStockCount, outOfStock: outOfStockCount },
    };
  } catch (error) {
    console.error("Error fetching paginated products:", error);
    return { success: false, message: "Failed to fetch products" };
  }
};

export const getTopRatedProducts = async (limit: number = 8) => {
  try {
    const db = await getDb();
    const count = Math.max(1, Math.min(24, Number(limit) || 8));
    return await db.collection("products").find({ status: "active" }).sort({ rating: -1 }).limit(count).toArray();
  } catch (error) {
    console.error("Error fetching top-rated products:", error);
    return [];
  }
};

export const deleteProduct = async (id: string) => {
  try {
    if (!id || !ObjectId.isValid(id)) {
      return { success: false, message: "Invalid product ID", status: 400 };
    }

    const db = await getDb();
    const product = await db.collection("products").findOne({ _id: new ObjectId(id) });
    if (!product) {
      return { success: false, message: "Product not found", status: 404 };
    }

    const result = await db.collection("products").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return { success: false, message: "Product not found", status: 404 };
    }

    const storedImages = getStoredImages(product);
    for (const img of storedImages) {
      await deleteImage(img.publicId);
    }

    return { success: true, message: "Product deleted successfully", status: 200 };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, message: "Internal server error", status: 500 };
  }
};

export const getAdminDashboardStats = async () => {
  try {
    const db = await getDb();
    const [
      totalProducts,
      totalUsers,
      totalOrders,
      earningsAgg,
      lowStockCount,
      outOfStockCount,
      lowStockProducts,
      categoryDistributionAgg,
      orderStatusAgg,
      recentOrders,
      recentUsers,
      allOrders,
    ] = await Promise.all([
      db.collection("products").countDocuments({}),
      db.collection("users").countDocuments({}),
      db.collection("orders").countDocuments({}),
      db
        .collection("orders")
        .aggregate([{ $match: { status: "delivered" } }, { $group: { _id: null, total: { $sum: "$total_amount" } } }])
        .toArray(),
      db.collection("products").countDocuments({ quantity: { $gt: 0, $lte: 5 } }),
      db.collection("products").countDocuments({ quantity: { $lte: 0 } }),
      db
        .collection("products")
        .find({ quantity: { $lte: 5 } })
        .sort({ quantity: 1 })
        .limit(6)
        .toArray(),
      db
        .collection("products")
        .aggregate([
          { $group: { _id: "$category", count: { $sum: 1 }, totalStock: { $sum: "$quantity" } } },
          { $sort: { count: -1 } },
        ])
        .toArray(),
      db
        .collection("orders")
        .aggregate([
          { $group: { _id: "$status", count: { $sum: 1 }, totalValue: { $sum: "$total_amount" } } },
          { $sort: { count: -1 } },
        ])
        .toArray(),
      db
        .collection("orders")
        .find({})
        .sort({ created_at: -1 })
        .limit(5)
        .toArray(),
      db
        .collection("users")
        .find({}, { projection: { password: 0 } })
        .sort({ created_at: -1 })
        .limit(5)
        .toArray(),
      db
        .collection("orders")
        .find({})
        .sort({ created_at: 1 })
        .toArray(),
    ]);

    // Build 6-Month Timeline Sales & Orders Trend
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const salesTrendMap: Record<string, { name: string; revenue: number; orders: number }> = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      salesTrendMap[key] = { name: key, revenue: 0, orders: 0 };
    }

    allOrders.forEach((order) => {
      const orderDate = order.created_at ? new Date(order.created_at) : new Date();
      const key = `${monthNames[orderDate.getMonth()]} ${orderDate.getFullYear().toString().slice(-2)}`;
      if (salesTrendMap[key]) {
        salesTrendMap[key].orders += 1;
        if (order.status === "delivered") {
          salesTrendMap[key].revenue += Number(order.total_amount) || 0;
        }
      }
    });

    const salesTrend = Object.values(salesTrendMap);

    const categoryDistribution = categoryDistributionAgg.map((item) => ({
      name: item._id || "Uncategorized",
      count: item.count,
      stock: item.totalStock || 0,
    }));

    const orderStatusBreakdown = orderStatusAgg.map((item) => ({
      status: item._id || "pending",
      count: item.count,
      value: item.totalValue || 0,
    }));

    const paymentBuckets: Record<string, PaymentBreakdownPoint> = {
      paid: { status: "Paid Online", count: 0, value: 0 },
      cod: { status: "COD", count: 0, value: 0 },
      awaiting: { status: "Awaiting", count: 0, value: 0 },
      failed: { status: "Failed", count: 0, value: 0 },
    };

    allOrders.forEach((order) => {
      const amount = Number(order.total_amount) || 0;
      const method = order.payment_method || "cod";
      const orderStatus = order.status;
      const paymentStatus = order.payment_status;

      if (orderStatus === "pending_payment") {
        paymentBuckets.awaiting.count += 1;
        paymentBuckets.awaiting.value += amount;
      } else if (orderStatus === "payment_failed" || paymentStatus === "failed") {
        paymentBuckets.failed.count += 1;
        paymentBuckets.failed.value += amount;
      } else if (paymentStatus === "paid" && method === "card") {
        paymentBuckets.paid.count += 1;
        paymentBuckets.paid.value += amount;
      } else if (method === "cod" && orderStatus !== "cancelled") {
        paymentBuckets.cod.count += 1;
        paymentBuckets.cod.value += amount;
      }
    });

    const paymentBreakdown = Object.values(paymentBuckets).filter((item) => item.count > 0);

    return {
      success: true,
      stats: {
        totalProducts,
        totalUsers,
        totalOrders,
        totalEarnings: earningsAgg[0]?.total || 0,
        lowStockCount,
        outOfStockCount,
        lowStockProducts,
        salesTrend,
        categoryDistribution,
        orderStatusBreakdown,
        paymentBreakdown,
        recentOrders,
        recentUsers,
      },
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return { success: false, message: "Failed to fetch stats" };
  }
};
