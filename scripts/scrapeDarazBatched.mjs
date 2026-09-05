import puppeteer from "puppeteer";
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

export async function runChromeScraper() {
  const scratchDir = path.join(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }
  const importFilePath = path.join(scratchDir, "import_areas.json");

  // Map of existing city data keyed by province::name -> areas[]
  const existingDataMap = new Map();
  if (fs.existsSync(importFilePath)) {
    try {
      const content = fs.readFileSync(importFilePath, "utf-8");
      const json = JSON.parse(content);
      const modules = json.module || (Array.isArray(json) ? json : []);
      for (const item of modules) {
        if (item && item.province && item.name) {
          const key = `${item.province.trim().toLowerCase()}::${item.name.trim().toLowerCase()}`;
          if (Array.isArray(item.areas)) {
            existingDataMap.set(key, {
              province: item.province,
              parentId: item.parentId || "",
              name: item.name,
              areas: item.areas,
            });
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  console.log(`ℹ️ Existing dataset contains ${existingDataMap.size} cities in local cache.`);

  let browser = null;
  let page = null;

  const ensurePage = async (forceRefresh = false) => {
    try {
      if (forceRefresh || !browser || !browser.isConnected()) {
        if (browser) {
          try { await browser.close(); } catch { /* ignore */ }
        }
        browser = await puppeteer.launch({
          executablePath: "/usr/bin/google-chrome",
          headless: "shell",
          protocolTimeout: 3600000,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
          ],
        });
        page = null;
      }
      if (forceRefresh || !page || page.isClosed()) {
        page = await browser.newPage();
        await page.setUserAgent(
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto("https://cart.daraz.pk/", { waitUntil: "commit", timeout: 15000 }).catch(() => {});
        await page.evaluate(() => new Promise((r) => setTimeout(r, 1500))).catch(() => {});
      }
    } catch {
      /* retry */
    }
  };

  await ensurePage();

  console.log("⚡ Step 2: Extracting full Daraz Pakistan location tree for ALL 8 provinces...");
  const fullTree = [];
  let totalSubAreas = 0;
  let newCitiesFetched = 0;

  for (const p of PROVINCES) {
    let cities = [];
    let attempts = 0;

    while (cities.length === 0 && attempts < 5) {
      attempts++;
      console.log(`\n📡 Fetching city list for province: ${p.name} (Attempt ${attempts})...`);
      await ensurePage(attempts > 1);

      cities = await page.evaluate(async (provId) => {
        try {
          const res = await fetch(
            `https://cart.daraz.pk/locationtree/api/getSubAddressList?countryCode=PK&addressId=${provId}&page=addressEdit`
          );
          const json = await res.json();
          if (json.ret && json.ret.some((r) => String(r).includes("FAIL_SYS_USER_VALIDATE"))) {
            return [];
          }
          return json.module || [];
        } catch {
          return [];
        }
      }, p.id).catch(() => []);

      if (cities.length === 0) {
        console.log(` ⚠️ Rate limit on ${p.name}. Waiting 5s & refreshing browser session...`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    if (cities.length === 0) {
      console.error(`❌ Could not fetch cities for province: ${p.name} after 5 attempts.`);
      continue;
    }

    console.log(`   Found ${cities.length} cities in ${p.name}. Syncing sub-areas...`);
    let provinceSubAreas = 0;

    const unpopulatedCities = [];
    for (const city of cities) {
      const key = `${p.name.trim().toLowerCase()}::${city.name.trim().toLowerCase()}`;
      if (existingDataMap.has(key)) {
        const existing = existingDataMap.get(key);
        fullTree.push(existing);
        if (existing.areas && existing.areas.length > 0) {
          provinceSubAreas += existing.areas.length;
          totalSubAreas += existing.areas.length;
        }
      } else {
        unpopulatedCities.push(city);
      }
    }

    console.log(
      `   [${p.name}] ${cities.length - unpopulatedCities.length} cached, ${unpopulatedCities.length} remaining to fetch.`
    );

    const chunkSize = 5;
    for (let cIdx = 0; cIdx < unpopulatedCities.length; cIdx += chunkSize) {
      const chunk = unpopulatedCities.slice(cIdx, cIdx + chunkSize);
      let success = false;
      let batchAttempts = 0;

      while (!success && batchAttempts < 4) {
        batchAttempts++;
        await ensurePage(batchAttempts > 1);

        let chunkRes = [];
        try {
          chunkRes = await page.evaluate(async (items) => {
            const out = [];
            for (const item of items) {
              try {
                const res = await fetch(
                  `https://cart.daraz.pk/locationtree/api/getSubAddressList?countryCode=PK&addressId=${item.id}&page=addressEdit`
                );
                const json = await res.json();
                if (json.ret && json.ret.some((r) => String(r).includes("FAIL_SYS_USER_VALIDATE"))) {
                  return null; // signal rate limit / WAF
                }
                const areaNames = json.module ? json.module.map((m) => m.name.trim()) : [];
                out.push({ id: item.id, name: item.name, areas: areaNames });
              } catch {
                out.push({ id: item.id, name: item.name, areas: [] });
              }
              await new Promise((r) => setTimeout(r, 200));
            }
            return out;
          }, chunk);
        } catch {
          chunkRes = null;
        }

        if (!chunkRes) {
          console.log(
            `   ⚠️ Rate limit at ${p.name} batch ${cIdx + 1}/${unpopulatedCities.length} (Attempt ${batchAttempts}). Waiting 5s...`
          );
          await new Promise((r) => setTimeout(r, 5000));
        } else {
          success = true;
          for (const itemRes of chunkRes) {
            newCitiesFetched++;
            if (itemRes.areas && itemRes.areas.length > 0) {
              provinceSubAreas += itemRes.areas.length;
              totalSubAreas += itemRes.areas.length;
            }
            const cityObj = {
              province: p.name,
              parentId: itemRes.id,
              name: itemRes.name,
              areas: itemRes.areas,
            };
            const key = `${p.name.trim().toLowerCase()}::${itemRes.name.trim().toLowerCase()}`;
            fullTree.push(cityObj);
            existingDataMap.set(key, cityObj);
          }
        }
      }

      // Checkpoint every 30 cities
      if ((cIdx + chunkSize) % 30 < chunkSize || cIdx + chunkSize >= unpopulatedCities.length) {
        const doneCount =
          cities.length - unpopulatedCities.length + Math.min(cIdx + chunkSize, unpopulatedCities.length);
        console.log(
          `   [${p.name}] ${doneCount}/${cities.length} cities processed (${totalSubAreas} total sub-areas PK)...`
        );

        fs.writeFileSync(importFilePath, JSON.stringify({ module: fullTree }, null, 2));

        try {
          const importModule = await import("./importDarazAreas.mjs");
          await importModule.importJsonPayloads();
        } catch (e) {
          console.error("   ⚠️ Checkpoint DB sync notice:", e.message);
        }
      }
    }

    console.log(`💾 Completed province ${p.name} (${provinceSubAreas} sub-areas).`);
  }

  if (browser) {
    await browser.close().catch(() => {});
  }

  console.log(`\n🎉 Step 3: All 8 Provinces Extraction Complete!`);
  console.log(`   Total cities in tree: ${fullTree.length}`);
  console.log(`   New cities scraped: ${newCitiesFetched}`);
  console.log(`   Total sub-areas extracted: ${totalSubAreas}`);

  console.log("\n💾 Step 4: Final update to MongoDB...");
  const importModule = await import("./importDarazAreas.mjs");
  await importModule.importJsonPayloads();
  console.log("✅ Complete Pakistan location tree successfully synchronized with MongoDB!");
}

if (process.argv[1] && process.argv[1].endsWith("scrapeDarazBatched.mjs")) {
  runChromeScraper().catch((err) => {
    console.error("❌ Scraper error:", err);
    process.exit(1);
  });
}
