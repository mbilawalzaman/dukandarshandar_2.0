import fs from "fs";
import path from "path";

const peshawarRaw = {
  "module": [
    { "id": "RPK6062", "name": "AlBadar Town", "parentId": "RPK5771" },
    { "id": "RPK6775", "name": "Bilal Town", "parentId": "RPK5771" },
    { "id": "RPK6910", "name": "Chamkani", "parentId": "RPK5771" },
    { "id": "RPK6207", "name": "Chughal Pura", "parentId": "RPK5771" },
    { "id": "RPK6107", "name": "Firdous", "parentId": "RPK5771" },
    { "id": "RPK6349", "name": "Gulbahar No - 1", "parentId": "RPK5771" },
    { "id": "RPK5854", "name": "Gulbahar No - 2", "parentId": "RPK5771" },
    { "id": "RPK5931", "name": "Gulbahar No - 3", "parentId": "RPK5771" },
    { "id": "RPK6853", "name": "Gulbahar No - 4", "parentId": "RPK5771" },
    { "id": "RPK7080", "name": "Gulbahar No - 5", "parentId": "RPK5771" },
    { "id": "RPK6785", "name": "Gulshan Colony", "parentId": "RPK5771" },
    { "id": "RPK6393", "name": "Haji Camp Adda", "parentId": "RPK5771" },
    { "id": "RPK6563", "name": "Hashtnagri", "parentId": "RPK5771" },
    { "id": "RPK6049", "name": "Jhagra", "parentId": "RPK5771" },
    { "id": "RPK6150", "name": "New City Homes", "parentId": "RPK5771" },
    { "id": "RPK6194", "name": "Peshawar Garden", "parentId": "RPK5771" },
    { "id": "RPK5816", "name": "Sethi Town", "parentId": "RPK5771" },
    { "id": "RPK6533", "name": "Sikandar Pura", "parentId": "RPK5771" },
    { "id": "RPK8765", "name": "Tarnab", "parentId": "RPK5771" },
    { "id": "RPK8586", "name": "Taru Jabba", "parentId": "RPK5771" }
  ]
};

const importFilePath = path.join(process.cwd(), "scratch", "import_areas.json");
let json = { module: [] };

if (fs.existsSync(importFilePath)) {
  json = JSON.parse(fs.readFileSync(importFilePath, "utf-8"));
}

const areas = peshawarRaw.module.map((m) => m.name.trim());
const peshawarObj = {
  province: "Khyber Pakhtunkhwa",
  parentId: "RPK5771",
  name: "Peshawar - GT Road Area",
  areas: areas,
};

// Find matching city index
const idx = json.module.findIndex(
  (m) =>
    (m.name.toLowerCase().includes("peshawar") && m.name.toLowerCase().includes("gt road")) ||
    m.parentId === "RPK5771"
);

if (idx >= 0) {
  json.module[idx] = peshawarObj;
} else {
  json.module.push(peshawarObj);
}

fs.writeFileSync(importFilePath, JSON.stringify(json, null, 2));
console.log(`✅ Added Peshawar - GT Road Area with ${areas.length} sub-areas to import_areas.json!`);
