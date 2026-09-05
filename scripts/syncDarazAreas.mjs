import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

const PROVINCES = [
  { name: "Punjab", id: "R357988" },
  { name: "Sindh", id: "R357981" },
  { name: "Khyber Pakhtunkhwa", id: "R3780131" },
  { name: "Balochistan", id: "R357968" },
  { name: "Islamabad Capital Territory", id: "R358002" },
  { name: "Azad Jammu & Kashmir", id: "R3780130" },
  { name: "Gilgit-Baltistan", id: "R80302264" },
  { name: "Federally Administered Tribal Areas", id: "R358004" },
];

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

async function fetchWithConcurrency(items, limit, fn) {
  const results = [];
  let index = 0;
  const workers = Array(limit).fill(null).map(async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

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

function normalizeLocationData(rows) {
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

export async function runSync() {
  const startTime = Date.now();
  console.log("🌐 Step 1: Fetching all L3 cities from Daraz Location Tree API...");
  
  const rawRows = [];
  let cityCount = 0;

  for (const p of PROVINCES) {
    try {
      const res = await fetch(
        `https://member.daraz.pk/locationtree/api/getSubAddressList?countryCode=PK&addressId=${p.id}&page=addressEdit`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      const data = await res.json();
      if (data.module && Array.isArray(data.module)) {
        cityCount += data.module.length;
        for (const item of data.module) {
          rawRows.push({
            province: p.name,
            cityId: item.id,
            name: item.name,
          });
        }
      }
    } catch (err) {
      console.error(`❌ Failed fetching cities for province ${p.name}:`, err.message);
    }
  }

  console.log(`✅ Fetched ${cityCount} city entries across ${PROVINCES.length} provinces.`);
  console.log("⚡ Step 2: Fetching L4 Areas for all cities (concurrency pool = 10)...");

  let totalAreasFetched = 0;
  const rowsWithAreas = await fetchWithConcurrency(rawRows, 10, async (row) => {
    try {
      const res = await fetch(
        `https://member.daraz.pk/locationtree/api/getSubAddressList?countryCode=PK&addressId=${row.cityId}&page=addressEdit`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      const data = await res.json();
      const areas = data.module && Array.isArray(data.module) ? data.module.map((m) => m.name.trim()) : [];
      if (areas.length > 0) totalAreasFetched += areas.length;
      return {
        province: row.province,
        name: row.name,
        areas,
      };
    } catch {
      return {
        province: row.province,
        name: row.name,
        areas: [],
      };
    }
  });

  console.log(`✅ Fetched ${totalAreasFetched} total sub-areas from Daraz in ${((Date.now() - startTime) / 1000).toFixed(1)}s.`);
  console.log("🔄 Step 3: Normalizing location data...");

  const normalizedCities = normalizeLocationData(rowsWithAreas);
  console.log(`Normalized ${rowsWithAreas.length} raw records → ${normalizedCities.length} distinct cities.`);

  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error("❌ DATABASE_URL environment variable is not defined.");
    process.exit(1);
  }

  console.log("💾 Step 4: Updating MongoDB...");
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
  console.log(`🎉 Success! Seeded ${normalizedCities.length} normalized cities & complete sub-areas to MongoDB in ${((Date.now() - startTime) / 1000).toFixed(1)}s!`);
}

if (process.argv[1] && process.argv[1].endsWith("syncDarazAreas.mjs")) {
  runSync().catch((err) => {
    console.error("❌ Sync error:", err);
    process.exit(1);
  });
}
