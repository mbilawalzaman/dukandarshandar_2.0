import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { uploadImage, deleteImage } from "@/lib/cloudinary";
import { getAuthUser } from "@/lib/auth";

export const createProduct = async (req: Request) => {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { name, category, price, quantity, description, rating, image, featured, created_by } = await req.json();

    if (!name || !category || !price || quantity === undefined || !image || !description) {
      return NextResponse.json({ success: false, message: "All fields are required" }, { status: 400 });
    }

    const db = await getDb();
    const uploaded = await uploadImage(image);

    const newProduct = {
      name,
      category,
      price: Number(price),
      quantity: Number(quantity),
      rating: rating || 0,
      ratings: rating ? [rating] : [],
      description,
      image: uploaded.url,
      image_public_id: uploaded.publicId,
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
    const { _id, rating, image, ...updateFields } = await req.json();

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

    if (image && (image.startsWith("data:") || (image.startsWith("http") && image !== product.image))) {
      const uploaded = await uploadImage(image);
      updateQuery.$set.image = uploaded.url;
      updateQuery.$set.image_public_id = uploaded.publicId;
      if (product.image_public_id && uploaded.publicId) {
        await deleteImage(product.image_public_id);
      }
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

export const getTopRatedProducts = async () => {
  try {
    const db = await getDb();
    return await db.collection("products").find({ status: "active" }).sort({ rating: -1 }).limit(8).toArray();
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

    await deleteImage(product.image_public_id);

    return { success: true, message: "Product deleted successfully", status: 200 };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, message: "Internal server error", status: 500 };
  }
};

export const getAdminDashboardStats = async () => {
  try {
    const db = await getDb();
    const [totalProducts, totalUsers, totalOrders, earningsAgg] = await Promise.all([
      db.collection("products").countDocuments({}),
      db.collection("users").countDocuments({}),
      db.collection("orders").countDocuments({}),
      db
        .collection("orders")
        .aggregate([{ $match: { status: "delivered" } }, { $group: { _id: null, total: { $sum: "$total_amount" } } }])
        .toArray(),
    ]);

    return {
      success: true,
      stats: {
        totalProducts,
        totalUsers,
        totalOrders,
        totalEarnings: earningsAgg[0]?.total || 0,
      },
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return { success: false, message: "Failed to fetch stats" };
  }
};
