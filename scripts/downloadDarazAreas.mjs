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

export async function downloadAllAreas() {
  const startTime = Date.now();
  console.log("🌐 Step 1: Fetching all Level 3 cities from Daraz API...");

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

  console.log(`✅ Fetched ${cityCount} city records. Now fetching sub-areas (concurrency pool = 10)...`);

  let totalSubAreas = 0;
  const rowsWithAreas = await fetchWithConcurrency(rawRows, 10, async (row) => {
    try {
      const res = await fetch(
        `https://member.daraz.pk/locationtree/api/getSubAddressList?countryCode=PK&addressId=${row.cityId}&page=addressEdit`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      const data = await res.json();
      const areas = data.module && Array.isArray(data.module) ? data.module.map((m) => m.name.trim()) : [];
      if (areas.length > 0) totalSubAreas += areas.length;
      return {
        province: row.province,
        cityId: row.cityId,
        name: row.name,
        areas,
      };
    } catch {
      return {
        province: row.province,
        cityId: row.cityId,
        name: row.name,
        areas: [],
      };
    }
  });

  console.log(`✅ Downloaded ${totalSubAreas} sub-areas across ${cityCount} cities in ${((Date.now() - startTime) / 1000).toFixed(1)}s.`);
  console.log("🔄 Normalizing downloaded data according to project rules...");

  const normalizedPreview = normalizeLocationData(rowsWithAreas);

  const outputDir = path.join(process.cwd(), "scratch");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const rawFilePath = path.join(outputDir, "darazRawAreas.json");
  const normalizedFilePath = path.join(outputDir, "darazNormalizedPreview.json");

  fs.writeFileSync(rawFilePath, JSON.stringify(rowsWithAreas, null, 2));
  fs.writeFileSync(normalizedFilePath, JSON.stringify(normalizedPreview, null, 2));

  console.log("\n=======================================================");
  console.log("📁 SAFE DOWNLOAD COMPLETED (NO DATABASE CHANGES MADE)");
  console.log("=======================================================");
  console.log(`1. Raw Daraz Output:        ${rawFilePath}`);
  console.log(`2. Normalized DB Preview:   ${normalizedFilePath}`);
  console.log(`Total Normalized Cities:    ${normalizedPreview.length}`);
  const citiesWithAreas = normalizedPreview.filter((c) => c.areas.length > 0);
  console.log(`Cities with Curated Areas:  ${citiesWithAreas.length}`);
  console.log("\nSample Normalized Cities:");
  for (const c of citiesWithAreas.slice(0, 5)) {
    console.log(` - [${c.province}] ${c.name} (${c.areas.length} areas):`, c.areas.slice(0, 4), "...");
  }
  console.log("=======================================================\n");
}

if (process.argv[1] && process.argv[1].endsWith("downloadDarazAreas.mjs")) {
  downloadAllAreas().catch((err) => {
    console.error("❌ Download error:", err);
    process.exit(1);
  });
}
