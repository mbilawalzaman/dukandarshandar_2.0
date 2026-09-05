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

const scratchDir = path.join(process.cwd(), "scratch");
const importFilePath = path.join(scratchDir, "import_areas.json");
const cookieFilePath = path.join(scratchDir, "daraz_cookies.txt");

function getHeaders() {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://member.daraz.pk/user/address/index",
  };

  // If user pasted cookies in scratch/daraz_cookies.txt or process.env.COOKIE
  if (process.env.COOKIE) {
    headers["Cookie"] = process.env.COOKIE.trim();
  } else if (fs.existsSync(cookieFilePath)) {
    const raw = fs.readFileSync(cookieFilePath, "utf-8").trim();
    if (raw) headers["Cookie"] = raw;
  }
  return headers;
}

async function fetchAddressList(addressId) {
  const url = `https://member.daraz.pk/locationtree/api/getSubAddressList?countryCode=PK&addressId=${addressId}&page=addressEdit`;
  try {
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.ret && json.ret.some((r) => String(r).includes("FAIL_SYS_USER_VALIDATE"))) {
      return "BLOCKED";
    }
    return json.module || [];
  } catch {
    return null;
  }
}

export async function crawlDarazTree() {
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  // Load existing map from import_areas.json
  const existingMap = new Map();
  if (fs.existsSync(importFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(importFilePath, "utf-8"));
      const modules = data.module || (Array.isArray(data) ? data : []);
      for (const item of modules) {
        if (item && item.province && item.name) {
          const key = `${item.province.trim().toLowerCase()}::${item.name.trim().toLowerCase()}`;
          existingMap.set(key, item);
        }
      }
    } catch {
      /* ignore */
    }
  }

  console.log(`ℹ️ Loaded ${existingMap.size} cities from local scratch database.`);
  console.log(`💡 Optional: Paste your browser Cookie in 'scratch/daraz_cookies.txt' to bypass rate limits.`);

  const fullTree = [];
  let totalSubAreas = 0;
  let newCitiesFetched = 0;

  for (const p of PROVINCES) {
    console.log(`\n📡 Fetching L3 City list for Province: ${p.name}...`);
    const cities = await fetchAddressList(p.id);

    if (cities === "BLOCKED") {
      console.error(`⚠️ WAF Rate Limit hit when querying province ${p.name}. Paste active browser Cookie in 'scratch/daraz_cookies.txt'.`);
      continue;
    }

    if (!Array.isArray(cities) || cities.length === 0) {
      console.log(`⚠️ No cities returned for province: ${p.name}`);
      continue;
    }

    console.log(`   Found ${cities.length} cities in ${p.name}. Crawling sub-areas...`);

    let pSubAreas = 0;
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      const key = `${p.name.trim().toLowerCase()}::${city.name.trim().toLowerCase()}`;

      // Check if cached with non-empty areas
      if (existingMap.has(key)) {
        const cached = existingMap.get(key);
        if (Array.isArray(cached.areas) && cached.areas.length > 0) {
          fullTree.push(cached);
          pSubAreas += cached.areas.length;
          totalSubAreas += cached.areas.length;
          continue;
        }
      }

      // If isLeafNode === false, query sub-areas (L4)
      let areas = [];
      if (city.isLeafNode === false) {
        const rawSub = await fetchAddressList(city.id);
        if (rawSub === "BLOCKED") {
          console.error(`⚠️ WAF Rate Limit hit at city [${p.name}] ${city.name}. Stopping crawl.`);
          break;
        }
        if (Array.isArray(rawSub)) {
          areas = rawSub.map((m) => m.name.trim()).filter(Boolean);
        }
        await new Promise((r) => setTimeout(r, 250)); // polite delay
      }

      newCitiesFetched++;
      if (areas.length > 0) {
        pSubAreas += areas.length;
        totalSubAreas += areas.length;
      }

      const cityObj = {
        province: p.name,
        parentId: city.id,
        name: city.name,
        areas,
      };

      fullTree.push(cityObj);
      existingMap.set(key, cityObj);

      // Save & Sync Checkpoint every 30 cities
      if ((i + 1) % 30 === 0 || i + 1 === cities.length) {
        console.log(`   [${p.name}] ${i + 1}/${cities.length} cities processed (${totalSubAreas} sub-areas PK)...`);
        fs.writeFileSync(importFilePath, JSON.stringify({ module: fullTree }, null, 2));

        try {
          const importModule = await import("./importDarazAreas.mjs");
          await importModule.importJsonPayloads();
        } catch (e) {
          console.error("   ⚠️ Checkpoint DB sync notice:", e.message);
        }
      }
    }

    console.log(`💾 Completed ${p.name} (${pSubAreas} sub-areas).`);
  }

  console.log(`\n🎉 Extraction finished! Total sub-areas: ${totalSubAreas}`);
  console.log("💾 Running final MongoDB synchronization...");
  const importModule = await import("./importDarazAreas.mjs");
  await importModule.importJsonPayloads();
  console.log("✅ All location data successfully synced to MongoDB!");
}

if (process.argv[1] && process.argv[1].endsWith("crawlDarazTree.mjs")) {
  crawlDarazTree().catch((err) => {
    console.error("❌ Crawler error:", err);
    process.exit(1);
  });
}
