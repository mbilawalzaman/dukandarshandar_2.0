import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

// 🛍️ Create Product
export const createProduct = async (req: Request) =>  {
  try {
    // Authenticate user
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ success: false, error: "Invalid Token" }, { status: 403 });

    // Extract product details
    const { name, category, price, quantity, description, rating, image, created_by } = await req.json();

    if (!name || !category || !price || !quantity || !image || !description) {
      return NextResponse.json({ success: false, message: "All fields are required" }, { status: 400 });
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db("dukandarshandar");

    // Create product object
    const newProduct = {
      name,
      category,
      price,
      quantity,
      rating: rating || 0,
      description,
      image,
      status: "active",
      created_by,
      updated_by: created_by,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Insert product into database
    const result = await db.collection("products").insertOne(newProduct);

    // Fetch the newly inserted product
    const insertedProduct = await db.collection("products").findOne({ _id: new ObjectId(result.insertedId) });

    if (!insertedProduct) {
      return NextResponse.json({ success: false, message: "Failed to fetch the product after insertion." }, { status: 500 });
    }

    // Return success response with the created product
    return NextResponse.json({ success: true, message: "Product created successfully", product: insertedProduct });
  } catch (error) {
    console.error("Error adding product:", error);
    return NextResponse.json({ success: false, message: "Failed to create product" }, { status: 500 });
  }
}


// ✏️ Update Product

export const updateProduct = async (req: Request) => {
  try {
    const { _id, rating, ...updateFields } = await req.json();

    if (!_id) {
      return NextResponse.json({ success: false, message: "Product ID is required" }, { status: 400 });
    }

    if (!ObjectId.isValid(_id)) {
      return NextResponse.json({ success: false, message: "Invalid Product ID format" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("dukandarshandar");

    // Fetch existing product
    const product = await db.collection("products").findOne({ _id: new ObjectId(_id) });

    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    // Prepare update query
    const updateQuery: { $set: Record<string, unknown> } = { $set: { ...updateFields } };

    // Update rating logic
    if (rating !== undefined) {
      const ratings = product.ratings || []; // Ensure ratings array exists
      ratings.push(rating); // Add new rating

      // Calculate the new average rating, rounded to the nearest 0.5
      const newAverageRating = Math.round(
        (ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length) * 2
      ) / 2;

      updateQuery.$set.rating = newAverageRating;
      updateQuery.$set.ratings = ratings;
    }

    // Perform update
    const updateResult = await db.collection("products").updateOne(
      { _id: new ObjectId(_id) },
      updateQuery
    );

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json({ success: false, message: "No changes were made" }, { status: 400 });
    }

    // Fetch and return updated product
    const updatedProduct = await db.collection("products").findOne({ _id: new ObjectId(_id) });

    return NextResponse.json({ success: true, message: "Product updated successfully", product: updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

export const getProductByID = async  (id: string) => {
  try {
    if (!id) {
      return {
        success: false,
        message: "Missing product ID",
        status: 400,
      };
    }

    if (!ObjectId.isValid(id)) {
      return {
        success: false,
        message: "Invalid product ID",
        status: 400,
      };
    }

    const client = await clientPromise;
    const db = client.db("dukandarshandar");

    const product = await db.collection("products").findOne({ _id: new ObjectId(id) });

    if (!product) {
      return {
        success: false,
        message: "Product not found",
        status: 404,
      };
    }

    return {
      success: true,
      product,
      status: 200,
    };
  } catch (error) {
    console.error("Error fetching product:", error);
    return {
      success: false,
      message: "Failed to fetch product",
      status: 500,
    };
  }
}

export const fetchProducts = async () => {
  try {
    const client = await clientPromise;
    const db = client.db("dukandarshandar");

    // Fetch all products from the "products" collection
    const products = await db.collection("products").find({}).toArray();

    return { success: true, products };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { success: false, message: "Failed to fetch products" };
  }
}

export const getTopRatedProducts = async () => {
  try {
    const client = await clientPromise;
    const db = client.db("dukandarshandar");

    const products = await db.collection("products")
    .find({ status: "active" })
    .sort({ rating: -1 }) 
    .limit(8)
    .toArray(); 

return products;
  } catch (error) {
    console.error("Error fetching top-rated products:", error);
    return [];
  }
};