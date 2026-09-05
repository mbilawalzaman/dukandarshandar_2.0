import fs from "fs";
import path from "path";

const scratchDir = path.join(process.cwd(), "scratch");
const groupedPath = path.join(scratchDir, "pakistan_locations_grouped.json");

if (!fs.existsSync(groupedPath)) {
  console.error("❌ grouped json missing!");
  process.exit(1);
}

const grouped = JSON.parse(fs.readFileSync(groupedPath, "utf-8"));

// 1. Generate Markdown Report
let md = `# 🇵🇰 Pakistan Shipping Location Coverage Report

This document contains the complete list of Provinces, Cities, and Sub-Areas configured in Dukandar Shandar.

## 📊 Summary Overview

`;

let totalCities = 0;
let totalSubAreas = 0;

grouped.forEach((p) => {
  let pSub = 0;
  p.cities.forEach((c) => {
    totalCities++;
    pSub += c.areas.length;
    totalSubAreas += c.areas.length;
  });
  md += `- **${p.province}**: ${p.cities.length} Cities, ${pSub} Sub-Areas\n`;
});

md += `\n**Total Coverage**: ${grouped.length} Provinces/Regions | ${totalCities} Total Cities | ${totalSubAreas} Sub-Areas\n\n`;
md += `---\n\n`;

grouped.forEach((p) => {
  md += `## 🏛️ ${p.province} (${p.cities.length} Cities)\n\n`;
  p.cities.forEach((c) => {
    if (c.areas.length > 0) {
      md += `### 📍 ${c.name} (${c.areas.length} sub-areas)\n`;
      md += c.areas.map((a) => `- ${a}`).join("\n") + "\n\n";
    } else {
      md += `### 📍 ${c.name} *(Free-text input for sub-area)*\n\n`;
    }
  });
});

const mdPath = path.join(scratchDir, "pakistan_shipping_locations.md");
fs.writeFileSync(mdPath, md);

// 2. Generate CSV Report
let csv = "Province,City,Sub-Area Count,Sub-Areas List\n";
grouped.forEach((p) => {
  p.cities.forEach((c) => {
    const areasStr =
      c.areas.length > 0
        ? `"${c.areas.join("; ")}"`
        : `"[Free-text area input]"`;
    csv += `"${p.province}","${c.name}",${c.areas.length},${areasStr}\n`;
  });
});

const csvPath = path.join(scratchDir, "pakistan_shipping_locations.csv");
fs.writeFileSync(csvPath, csv);

console.log("✅ Reports generated successfully!");
console.log(` - ${mdPath}`);
console.log(` - ${csvPath}`);
