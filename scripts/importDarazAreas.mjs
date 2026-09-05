import fs from "fs";
import path from "path";
import { MongoClient } from "mongodb";

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

function expandRowAreas(cityName, rawName, rawAreas, suffix) {
  const out = new Set();
  if (Array.isArray(rawAreas)) {
    for (const a of rawAreas) {
      const cleaned = String(a || "").trim();
      if (cleaned) out.add(cleaned);
    }
  }
  if (suffix) out.add(suffix);
  return [...out];
}

export function normalizeLocationData(rows) {
  const map = new Map();

  for (const item of rows) {
    const province = String(item.province || "").trim();
    const rawName = String(item.name || "").trim();
    if (!province || !rawName) continue;

    const provinceKey = province.toLowerCase();
    const nameKey = rawName.toLowerCase();

    const rawAreas = Array.isArray(item.areas) ? item.areas : [];
    const areas = rawAreas
      .map((a) => String(a || "").trim())
      .filter((a) => a.length > 0 && a.toLowerCase() !== nameKey);

    const key = `${provinceKey}::${nameKey}`;
    if (!map.has(key)) {
      map.set(key, { province, name: rawName, areas: new Set(areas) });
    } else {
      const existing = map.get(key);
      for (const area of areas) existing.areas.add(area);
    }
  }

  return [...map.values()]
    .map((city) => ({
      province: city.province,
      name: city.name,
      areas: [...city.areas].sort((a, b) => a.localeCompare(b)),
    }))
    .sort(
      (a, b) =>
        a.province.localeCompare(b.province) || a.name.localeCompare(b.name)
    );
}

export async function importJsonPayloads() {
  const importDir = path.join(process.cwd(), "scratch", "import");
  const singleFile = path.join(process.cwd(), "scratch", "import_areas.json");

  const filesToProcess = [];
  if (fs.existsSync(singleFile)) filesToProcess.push(singleFile);
  if (fs.existsSync(importDir)) {
    for (const f of fs.readdirSync(importDir)) {
      if (f.endsWith(".json")) filesToProcess.push(path.join(importDir, f));
    }
  }

  if (filesToProcess.length === 0) {
    console.log("ℹ️ No import files found.");
    process.exit(0);
  }

  console.log(`📁 Found ${filesToProcess.length} JSON file(s) to process.`);

  const rawRows = [];

  for (const filePath of filesToProcess) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(content);
      const modules = json.module || (Array.isArray(json) ? json : []);

      for (const item of modules) {
        if (!item || !item.name) continue;
        if (item.province && (item.areas || item.parentId)) {
          rawRows.push(item);
        }
      }
    } catch (e) {
      console.error(`❌ Error parsing ${filePath}:`, e.message);
    }
  }

  // Load existing seedLocations.mjs rows to preserve any manual additions
  const seedFilePath = path.join(process.cwd(), "scripts", "seedLocations.mjs");
  const existingContent = fs.readFileSync(seedFilePath, "utf-8");
  const matches = [...existingContent.matchAll(/\{\s*province:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*areas:\s*(\[[^\]]*\])\s*\}/g)];
  for (const m of matches) {
    rawRows.push({
      province: m[1],
      name: m[2],
      areas: JSON.parse(m[3]),
    });
  }

  console.log("🔄 Normalizing location data across all imported and existing records...");
  const normalizedCities = normalizeLocationData(rawRows);

  console.log(`✅ Total distinct normalized cities: ${normalizedCities.length}`);

  // Re-build seedLocations.mjs
  const fileHeader = `import { MongoClient } from "mongodb";

export const PAKISTAN_PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Azad Jammu & Kashmir",
  "Gilgit-Baltistan",
  "Federally Administered Tribal Areas"
];

// Curated Location Data
const LOCATION_DATA = [\n`;

  const rowsCode = normalizedCities
    .map(
      (c) =>
        `  { province: ${JSON.stringify(c.province)}, name: ${JSON.stringify(c.name)}, areas: ${JSON.stringify(c.areas)} }`
    )
    .join(",\n");

  const fileFooter = `\n];

export async function run() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error("❌ DATABASE_URL is not defined in environment variables.");
    process.exit(1);
  }

  console.log("Connected to MongoDB.");
  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db("dukandarshandar");
  const locationsCol = db.collection("locations");
  const settingsCol = db.collection("settings");

  console.log("Creating indexes on 'locations' collection...");
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

  for (const city of LOCATION_DATA) {
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
    console.log(
      \`Bulk write completed: \${bulkRes.upsertedCount} inserted, \${bulkRes.modifiedCount} modified.\`
    );
  }

  const deleteRes = await locationsCol.deleteMany({
    $nor: keepKeys.map((k) => ({ provinceKey: k.provinceKey, nameKey: k.nameKey })),
  });
  if (deleteRes.deletedCount > 0) {
    console.log(\`Removed \${deleteRes.deletedCount} obsolete location documents.\`);
  }

  console.log("Upserting 'pakistan_provinces' in settings collection...");
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

  console.log(
    \`✅ Successfully seeded \${LOCATION_DATA.length} cities and \${PAKISTAN_PROVINCES.length} provinces to MongoDB!\`
  );
  await client.close();
}

if (process.argv[1] && process.argv[1].endsWith("seedLocations.mjs")) {
  run().catch((err) => {
    console.error("❌ Error seeding locations:", err);
    process.exit(1);
  });
}
`;

  fs.writeFileSync(seedFilePath, fileHeader + rowsCode + fileFooter);
  console.log(`💾 Rewrote ${seedFilePath} with ${normalizedCities.length} clean, normalized city records.`);

  // Now seed MongoDB
  console.log("💾 Seeding location data into MongoDB...");
  const seedModule = await import("./seedLocations.mjs");
  await seedModule.run();

  console.log("🎉 Success! Imported and seeded location updates into MongoDB.");
}

if (process.argv[1] && process.argv[1].endsWith("importDarazAreas.mjs")) {
  importJsonPayloads().catch((err) => {
    console.error("❌ Import error:", err);
    process.exit(1);
  });
}
