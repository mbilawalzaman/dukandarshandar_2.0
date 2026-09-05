import fs from "fs";
import path from "path";

const groupedPath = path.join(process.cwd(), "scratch", "pakistan_locations_grouped.json");
const grouped = JSON.parse(fs.readFileSync(groupedPath, "utf-8"));

let doc = `# 🇵🇰 Complete Pakistan Shipping Location Directory (Cities & Sub-Areas)

This document contains every city in Pakistan along with its defined sub-areas/neighborhoods.

`;

for (const p of grouped) {
  doc += `\n# ==========================================\n`;
  doc += `# PROVINCE / REGION: ${p.province.toUpperCase()}\n`;
  doc += `# (${p.cities.length} Cities Total)\n`;
  doc += `# ==========================================\n\n`;

  for (const c of p.cities) {
    if (c.areas.length > 0) {
      doc += `## 📍 ${c.name} (${c.areas.length} Sub-Areas)\n`;
      doc += c.areas.map((a) => `  - ${a}`).join("\n") + "\n\n";
    } else {
      doc += `## 📍 ${c.name}\n  - *(Free-text address / Single Town)*\n\n`;
    }
  }
}

const outputPath = path.join(process.cwd(), "scratch", "pakistan_cities_and_subareas.txt");
fs.writeFileSync(outputPath, doc);

const artifactPath = "/home/billa/.gemini/antigravity-ide/brain/0766da2c-182a-4301-abea-1c7c7b8fa2ae/pakistan_cities_and_subareas.md";
fs.writeFileSync(artifactPath, doc);

console.log("✅ Written full detailed list to:", outputPath, "and artifact:", artifactPath);
