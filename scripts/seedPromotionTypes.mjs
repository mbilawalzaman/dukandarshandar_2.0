/**
 * Insert the system promotion presets if they are missing.
 *   node --env-file=.env scripts/seedPromotionTypes.mjs
 *
 * Presets are the single list in src/data/promotionTypePresets.json (shared with the app).
 */
import { MongoClient } from "mongodb";
import presets from "../src/data/promotionTypePresets.json" with { type: "json" };

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db("dukandarshandar");
let inserted = 0;
for (const preset of presets) {
  const exists = await db.collection("promotion_types").findOne({ name: preset.name, isSystem: true });
  if (exists) continue;
  const now = new Date();
  await db.collection("promotion_types").insertOne({ ...preset, isSystem: true, isActive: true, createdAt: now, updatedAt: now });
  inserted += 1;
}
console.log(`seeded ${inserted} promotion type preset(s)`);
await client.close();
