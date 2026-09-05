import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

export const PAKISTAN_PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Azad Jammu & Kashmir",
  "Gilgit-Baltistan",
  "Federally Administered Tribal Areas",
];

export async function applyAreasToDb() {
  const normalizedFilePath = path.join(process.cwd(), "scratch", "darazNormalizedPreview.json");
  if (!fs.existsSync(normalizedFilePath)) {
    console.error(`❌ Normalized file not found at: ${normalizedFilePath}`);
    console.error("Please run 'npm run download:areas' first to download and inspect data.");
    process.exit(1);
  }

  const normalizedCities = JSON.parse(fs.readFileSync(normalizedFilePath, "utf-8"));
  console.log(`📖 Read ${normalizedCities.length} normalized cities from ${normalizedFilePath}`);

  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error("❌ DATABASE_URL environment variable is not defined.");
    process.exit(1);
  }

  console.log("💾 Connecting to MongoDB to safely apply location updates...");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("dukandarshandar");
  const locationsCol = db.collection("locations");
  const settingsCol = db.collection("settings");

  try {
    await locationsCol.dropIndex("nameKey_1");
  } catch {
    /* ignore */
  }

  await locationsCol.createIndex({ provinceKey: 1, nameKey: 1 }, { unique: true });
  await locationsCol.createIndex({ nameKey: 1 });
  await locationsCol.createIndex({ provinceKey: 1, name: 1 });

  const bulkOps = [];
  const keepKeys = [];

  for (const city of normalizedCities) {
    const nameKey = city.name.trim().toLowerCase();
    const provinceKey = city.province.trim().toLowerCase();
    const areas = Array.isArray(city.areas)
      ? city.areas.map((a) => String(a).trim()).filter(Boolean)
      : [];
    keepKeys.push({ provinceKey, nameKey });

    bulkOps.push({
      updateOne: {
        filter: { provinceKey, nameKey },
        update: {
          $set: {
            name: city.name.trim(),
            nameKey,
            province: city.province.trim(),
            provinceKey,
            areas,
            isActive: true,
            updated_at: new Date(),
          },
          $setOnInsert: {
            created_at: new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  if (bulkOps.length > 0) {
    const bulkRes = await locationsCol.bulkWrite(bulkOps);
    console.log(`Bulk write completed: ${bulkRes.upsertedCount} inserted, ${bulkRes.modifiedCount} modified.`);
  }

  const deleteRes = await locationsCol.deleteMany({
    $nor: keepKeys.map((k) => ({ provinceKey: k.provinceKey, nameKey: k.nameKey })),
  });
  if (deleteRes.deletedCount > 0) {
    console.log(`Removed ${deleteRes.deletedCount} obsolete location documents.`);
  }

  await settingsCol.updateOne(
    { key: "pakistan_provinces" },
    {
      $set: {
        key: "pakistan_provinces",
        value: PAKISTAN_PROVINCES,
        updated_at: new Date(),
      },
    },
    { upsert: true }
  );

  await client.close();
  console.log(`🎉 Successfully applied ${normalizedCities.length} verified cities & sub-areas to MongoDB!`);
}

if (process.argv[1] && process.argv[1].endsWith("applyDarazAreas.mjs")) {
  applyAreasToDb().catch((err) => {
    console.error("❌ Apply error:", err);
    process.exit(1);
  });
}
