import fs from "fs";
import path from "path";

const mansehraRaw = {
  "module": [
    { "id": "RPK1435", "name": "Abbottabad Road", "parentId": "R80302350" },
    { "id": "RPK1838", "name": "Afghan Basti", "parentId": "R80302350" },
    { "id": "RPK930", "name": "Akbar Khan Road", "parentId": "R80302350" },
    { "id": "RPK7419", "name": "Arab Khan", "parentId": "R80302350" },
    { "id": "RPK4470", "name": "Aslamabad", "parentId": "R80302350" },
    { "id": "RPK1567", "name": "Attarsheesha", "parentId": "R80302350" },
    { "id": "RPK1591", "name": "Baffa", "parentId": "R80302350" },
    { "id": "RPK1573", "name": "Baidra Chowk", "parentId": "R80302350" },
    { "id": "RPK1451", "name": "Batal", "parentId": "R80302350" },
    { "id": "RPK633", "name": "Bazaar", "parentId": "R80302350" },
    { "id": "RPK906", "name": "Bherkund", "parentId": "R80302350" },
    { "id": "RPK3640", "name": "Bughi Dheri", "parentId": "R80302350" },
    { "id": "RPK223", "name": "Butpul", "parentId": "R80302350" },
    { "id": "RPK982", "name": "Bypass Road", "parentId": "R80302350" },
    { "id": "RPK699", "name": "Chakiah Road", "parentId": "R80302350" },
    { "id": "RPK405", "name": "Channai", "parentId": "R80302350" },
    { "id": "RPK1224", "name": "Chattar Plain", "parentId": "R80302350" },
    { "id": "RPK1159", "name": "Chitta Batta", "parentId": "R80302350" },
    { "id": "RPK945", "name": "Chitti Dheri", "parentId": "R80302350" },
    { "id": "RPK719", "name": "Collegedoraha", "parentId": "R80302350" },
    { "id": "RPK100", "name": "College Road", "parentId": "R80302350" },
    { "id": "RPK1370", "name": "Dangri Chowk", "parentId": "R80302350" },
    { "id": "RPK203", "name": "Darband", "parentId": "R80302350" },
    { "id": "RPK5019", "name": "Darr Mian", "parentId": "R80302350" },
    { "id": "RPK91", "name": "Data", "parentId": "R80302350" },
    { "id": "RPK4979", "name": "Dhangri", "parentId": "R80302350" },
    { "id": "RPK9240", "name": "Dhodial", "parentId": "R80302350" },
    { "id": "RPK1757", "name": "Dub 2", "parentId": "R80302350" },
    { "id": "RPK3274", "name": "Faizabad", "parentId": "R80302350" },
    { "id": "RPK86", "name": "Gandhian", "parentId": "R80302350" },
    { "id": "RPK778", "name": "Ghazikot", "parentId": "R80302350" },
    { "id": "RPK4125", "name": "Ghazikot TWP", "parentId": "R80302350" },
    { "id": "RPK2879", "name": "Ghazikot Village", "parentId": "R80302350" },
    { "id": "RPK5221", "name": "Gullababad", "parentId": "R80302350" },
    { "id": "RPK4349", "name": "Gullabad", "parentId": "R80302350" },
    { "id": "RPK1997", "name": "Hadu Bandi", "parentId": "R80302350" },
    { "id": "RPK9173", "name": "Hazara University", "parentId": "R80302350" },
    { "id": "RPK7911", "name": "Jaba", "parentId": "R80302350" },
    { "id": "RPK3238", "name": "Jaloo", "parentId": "R80302350" },
    { "id": "RPK4545", "name": "JLA Shinkiari", "parentId": "R80302350" },
    { "id": "RPK717", "name": "Kashmir Road", "parentId": "R80302350" },
    { "id": "RPK256", "name": "Khaki", "parentId": "R80302350" },
    { "id": "RPK8035", "name": "Khawajgan", "parentId": "R80302350" },
    { "id": "RPK1347", "name": "Khwajagan", "parentId": "R80302350" },
    { "id": "RPK628", "name": "Lari Adda", "parentId": "R80302350" },
    { "id": "RPK475", "name": "Lasan Nawab", "parentId": "R80302350" },
    { "id": "RPK230", "name": "Lasan Thakral", "parentId": "R80302350" },
    { "id": "RPK1139", "name": "Lohar Banda", "parentId": "R80302350" },
    { "id": "RPK3096", "name": "Madina Colony", "parentId": "R80302350" },
    { "id": "RPK3855", "name": "Madina Colony Dub 2", "parentId": "R80302350" },
    { "id": "RPK1395", "name": "Main Bazaar", "parentId": "R80302350" },
    { "id": "RPK217", "name": "Main City", "parentId": "R80302350" },
    { "id": "RPK759", "name": "Main Dab Area", "parentId": "R80302350" },
    { "id": "RPK4879", "name": "Mohallah Azizabad", "parentId": "R80302350" },
    { "id": "RPK5691", "name": "Mohalla Noghazi", "parentId": "R80302350" },
    { "id": "RPK1384", "name": "Noghazi", "parentId": "R80302350" },
    { "id": "RPK1248", "name": "Oghi", "parentId": "R80302350" },
    { "id": "RPK1103", "name": "Pakhwal Chowk", "parentId": "R80302350" },
    { "id": "RPK1260", "name": "Parhina", "parentId": "R80302350" },
    { "id": "RPK397", "name": "Phagla", "parentId": "R80302350" },
    { "id": "RPK159", "name": "Punjab Chowk", "parentId": "R80302350" },
    { "id": "RPK559", "name": "Reerh", "parentId": "R80302350" },
    { "id": "RPK8017", "name": "Sarwar Abad", "parentId": "R80302350" },
    { "id": "RPK926", "name": "Session Court", "parentId": "R80302350" },
    { "id": "RPK1071", "name": "Shahra-e-Resham", "parentId": "R80302350" },
    { "id": "RPK132", "name": "Shanwaz Chowk", "parentId": "R80302350" },
    { "id": "RPK1457", "name": "Shelia Road", "parentId": "R80302350" },
    { "id": "RPK1091", "name": "Shinkiari", "parentId": "R80302350" },
    { "id": "RPK1629", "name": "Shinkiari Road", "parentId": "R80302350" },
    { "id": "RPK941", "name": "Thakra", "parentId": "R80302350" },
    { "id": "RPK1318", "name": "Township", "parentId": "R80302350" },
    { "id": "RPK4966", "name": "Zeeb Town", "parentId": "R80302350" }
  ]
};

const importFilePath = path.join(process.cwd(), "scratch", "import_areas.json");
let json = { module: [] };

if (fs.existsSync(importFilePath)) {
  json = JSON.parse(fs.readFileSync(importFilePath, "utf-8"));
}

const areas = mansehraRaw.module.map((m) => m.name.trim());
const mansehraObj = {
  province: "Khyber Pakhtunkhwa",
  parentId: "R80302350",
  name: "Mansehra",
  areas: areas,
};

// Replace or push
const idx = json.module.findIndex(
  (m) => m.name.toLowerCase() === "mansehra" && m.province.toLowerCase().includes("khyber")
);

if (idx >= 0) {
  json.module[idx] = mansehraObj;
} else {
  json.module.push(mansehraObj);
}

fs.writeFileSync(importFilePath, JSON.stringify(json, null, 2));
console.log(`✅ Added Mansehra in KPK with ${areas.length} sub-areas to import_areas.json!`);
