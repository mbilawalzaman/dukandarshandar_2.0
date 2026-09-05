import fs from "fs";
import path from "path";

async function main() {
  const scratchFile = path.join(process.cwd(), "scratch", "import_areas.json");

  let allRows = [];

  // Load from import_areas.json
  if (fs.existsSync(scratchFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(scratchFile, "utf-8"));
      const items = data.module || (Array.isArray(data) ? data : []);
      for (const item of items) {
        if (item.province && item.name) {
          allRows.push({
            province: item.province,
            name: item.name,
            areas: Array.isArray(item.areas) ? item.areas : [],
          });
        }
      }
    } catch (e) {
      console.error("Error reading import_areas.json:", e.message);
    }
  }

  // Load from seedLocations.mjs via dynamic import
  try {
    const seedModule = await import("../scripts/seedLocations.mjs");
    // Parse raw text of seedLocations.mjs for LOCATION_DATA array if not exported
    const seedContent = fs.readFileSync(path.join(process.cwd(), "scripts", "seedLocations.mjs"), "utf-8");
    const jsonText = seedContent
      .replace(/^[\s\S]*?const LOCATION_DATA = /, "")
      .replace(/;\s*export async function[\s\S]*/, "")
      .trim();

    const seedItems = eval(jsonText);
    if (Array.isArray(seedItems)) {
      for (const item of seedItems) {
        allRows.push({
          province: item.province,
          name: item.name,
          areas: Array.isArray(item.areas) ? item.areas : [],
        });
      }
    }
  } catch (e) {
    console.error("Notice parsing seedLocations.mjs:", e.message);
  }

  // Deduplicate and normalize by province::name
  const map = new Map();
  for (const row of allRows) {
    const province = String(row.province || "").trim();
    const name = String(row.name || "").trim();
    if (!province || !name) continue;

    const key = `${province.toLowerCase()}::${name.toLowerCase()}`;
    const areas = (Array.isArray(row.areas) ? row.areas : [])
      .map((a) => String(a || "").trim())
      .filter((a) => a.length > 0 && a.toLowerCase() !== name.toLowerCase());

    if (!map.has(key)) {
      map.set(key, { province, name, areas: new Set(areas) });
    } else {
      const existing = map.get(key);
      for (const area of areas) existing.areas.add(area);
    }
  }

  // Group by Province -> Cities
  const provinceMap = new Map();
  for (const city of map.values()) {
    if (!provinceMap.has(city.province)) {
      provinceMap.set(city.province, []);
    }
    provinceMap.get(city.province).push({
      name: city.name,
      areas: [...city.areas].sort((a, b) => a.localeCompare(b)),
    });
  }

  // Build clean grouped tree
  const tree = [];
  for (const [province, cities] of provinceMap.entries()) {
    cities.sort((a, b) => a.name.localeCompare(b.name));
    tree.push({
      province,
      totalCities: cities.length,
      cities,
    });
  }
  tree.sort((a, b) => a.province.localeCompare(b.province));

  // Build flat array format
  const flatCities = [];
  for (const city of map.values()) {
    flatCities.push({
      province: city.province,
      name: city.name,
      areas: [...city.areas].sort((a, b) => a.localeCompare(b)),
    });
  }
  flatCities.sort(
    (a, b) => a.province.localeCompare(b.province) || a.name.localeCompare(b.name)
  );

  // Write files
  const scratchDir = path.join(process.cwd(), "scratch");
  const dataDir = path.join(process.cwd(), "src", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const groupedPath = path.join(scratchDir, "pakistan_locations_grouped.json");
  const flatPath = path.join(dataDir, "pakistanLocations.json");

  fs.writeFileSync(groupedPath, JSON.stringify(tree, null, 2));
  fs.writeFileSync(flatPath, JSON.stringify(flatCities, null, 2));

  console.log(`✅ Generated location list successfully!`);
  console.log(`   Total distinct cities across PK: ${flatCities.length}`);
  console.log(`   Total provinces: ${tree.length}`);
  const citiesWithAreas = flatCities.filter((c) => c.areas.length > 0);
  console.log(`   Cities with populated sub-areas: ${citiesWithAreas.length}`);
  console.log(`\nProvinces Summary:`);
  for (const p of tree) {
    const populatedInP = p.cities.filter((c) => c.areas.length > 0).length;
    console.log(` - ${p.province}: ${p.totalCities} cities (${populatedInP} with sub-areas)`);
  }
  console.log(`\nFiles created:`);
  console.log(` - ${groupedPath}`);
  console.log(` - ${flatPath}`);
}

main();
