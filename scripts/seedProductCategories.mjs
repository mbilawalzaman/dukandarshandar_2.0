// Run once when deploying dynamic categories: npm run seed:categories
import { MongoClient } from "mongodb";

const uri = process.env.DATABASE_URL;
if (!uri) throw new Error("DATABASE_URL is required");
const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "dukandarshandar");
  const existingNames = await db.collection("products").distinct("category", { category: { $type: "string" } });
  const names = [...new Set([
    "Stationery", "Craft", "Clock", "Pen", "Diary", "Bags", "Other", ...existingNames,
  ].map((name) => name.trim().replace(/\s+/g, " ")).filter(Boolean))];
  const result = await db.collection("productCategories").bulkWrite(names.map((name) => ({
    updateOne: {
      filter: { _id: name.toLowerCase() },
      update: { $setOnInsert: { name, createdAt: new Date() } },
      upsert: true,
    },
  })));
  console.log(`Created ${result.upsertedCount} categories; existing categories were preserved.`);
} finally {
  await client.close();
}
