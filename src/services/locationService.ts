import { getDb } from "@/lib/db";

export interface CityLocationDoc {
  name: string;
  nameKey: string;
  province: string;
  provinceKey: string;
  areas: string[];
  isActive?: boolean;
}

function getProvinceQueryFilter(provinceInput: string): Record<string, unknown> {
  const p = provinceInput.trim().toLowerCase();
  if (p.includes("azad") || p.includes("kashmir")) {
    return { provinceKey: { $in: ["azad kashmir", "azad jammu & kashmir", "azad jammu and kashmir"] } };
  }
  if (p.includes("islamabad")) {
    return { provinceKey: { $in: ["islamabad", "islamabad capital territory"] } };
  }
  if (p.includes("tribal") || p.includes("fata")) {
    return {
      provinceKey: {
        $in: ["federally administered tribal areas", "fata"],
      },
    };
  }
  if (p.includes("khyber") || p.includes("kpk") || p.includes("pakhtunkhwa")) {
    return { provinceKey: { $in: ["khyber pakhtunkhwa", "kpk", "kp"] } };
  }
  if (p.includes("sindh")) {
    return { provinceKey: "sindh" };
  }
  if (p.includes("punjab")) {
    return { provinceKey: "punjab" };
  }
  if (p.includes("balochistan")) {
    return { provinceKey: "balochistan" };
  }
  if (p.includes("gilgit") || p.includes("baltistan")) {
    return { provinceKey: "gilgit-baltistan" };
  }
  return { provinceKey: p };
}

export async function listProvinces(): Promise<string[]> {
  const db = await getDb();
  const settingDoc = await db.collection("settings").findOne({ key: "pakistan_provinces" });
  if (settingDoc && Array.isArray(settingDoc.value) && settingDoc.value.length > 0) {
    return settingDoc.value as string[];
  }
  const distinct = await db.collection("locations").distinct("province", { isActive: { $ne: false } });
  return (distinct as string[]).sort();
}

export async function listCities(province?: string): Promise<{ name: string; province: string }[]> {
  const db = await getDb();
  const query: Record<string, unknown> = { isActive: { $ne: false } };
  if (province && province.trim()) {
    Object.assign(query, getProvinceQueryFilter(province));
  }
  const docs = await db
    .collection<CityLocationDoc>("locations")
    .find(query, { projection: { name: 1, province: 1, _id: 0 } })
    .sort({ name: 1 })
    .toArray();

  return docs.map((doc) => ({
    name: doc.name,
    province: doc.province,
  }));
}

/** Drop echo areas (area name === city name or parent city or suffix) so small towns stay freeSolo. */
function curatedAreaList(
  cityName: string,
  areas: string[] | undefined,
  parentCityName?: string,
  suffixArea?: string
): string[] {
  const cityKey = cityName.trim().toLowerCase();
  const parentKey = parentCityName ? parentCityName.trim().toLowerCase() : null;
  const suffixKey = suffixArea ? suffixArea.trim().toLowerCase() : null;

  return (areas || [])
    .map((a) => String(a).trim())
    .filter((a) => {
      const lower = a.toLowerCase();
      if (!lower) return false;
      if (lower === cityKey) return false;
      if (parentKey && lower === parentKey) return false;
      if (suffixKey && lower === suffixKey) return false;
      return true;
    })
    .sort((a, b) => a.localeCompare(b));
}

export async function listAreas(cityName: string, province?: string): Promise<string[]> {
  if (!cityName || !cityName.trim()) return [];
  const db = await getDb();
  const rawInput = cityName.trim();
  const nameKey = rawInput.toLowerCase();

  const hyphenMatch = rawInput.match(/^(.+?)\s*[-–]\s*(.+)$/i);
  const parentCityName = hyphenMatch ? hyphenMatch[1].trim() : rawInput;
  const suffixArea = hyphenMatch ? hyphenMatch[2].trim() : null;
  const parentKey = parentCityName.toLowerCase();

  const queryFilter = province && province.trim() ? getProvinceQueryFilter(province) : {};

  // 1. Try exact doc matching current nameKey
  const exactDoc = await db
    .collection<CityLocationDoc>("locations")
    .findOne({ nameKey, isActive: { $ne: false }, ...queryFilter });

  if (exactDoc && exactDoc.areas && exactDoc.areas.length > 0) {
    const curated = curatedAreaList(
      exactDoc.name,
      exactDoc.areas,
      parentCityName,
      suffixArea || undefined
    );
    if (curated.length > 0) {
      return curated;
    }
  }

  // If input already specified a specific sub-zone (e.g. "Lahore - Johar Town") and exactDoc has no specific sub-areas,
  // do NOT aggregate all other sibling sub-zones (like Garhi Shahu, Askari, Badami Bagh).
  if (hyphenMatch) {
    return [];
  }

  // 2. For generic parent cities (e.g. "Lahore" or "Bahawalpur"), aggregate areas from parent doc & matching "Parent - *" docs
  const areaSet = new Set<string>();

  const parentDoc = await db
    .collection<CityLocationDoc>("locations")
    .findOne({ nameKey: parentKey, isActive: { $ne: false }, ...queryFilter });

  if (parentDoc && parentDoc.areas) {
    for (const a of curatedAreaList(parentDoc.name, parentDoc.areas, parentCityName)) {
      areaSet.add(a);
    }
  }

  // 3. Prefix match for all "ParentCity - *" docs
  const regex = new RegExp(`^${parentKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  const matchingDocs = await db
    .collection<CityLocationDoc>("locations")
    .find(
      { nameKey: { $regex: regex }, isActive: { $ne: false }, ...queryFilter },
      { projection: { name: 1, areas: 1, _id: 0 } }
    )
    .toArray();

  for (const doc of matchingDocs) {
    for (const area of curatedAreaList(parentCityName, doc.areas)) {
      areaSet.add(area);
    }
    const hMatch = (doc.name || "").match(/^(.+?)\s*[-–]\s*(.+)$/i);
    if (hMatch && hMatch[1].trim().toLowerCase() === parentKey) {
      areaSet.add(hMatch[2].trim());
    }
  }

  return Array.from(areaSet)
    .filter((a) => a.toLowerCase() !== parentKey && a.toLowerCase() !== nameKey)
    .sort((a, b) => a.localeCompare(b));
}

export async function getLocationByCity(
  cityName: string,
  province?: string
): Promise<CityLocationDoc | null> {
  if (!cityName || !cityName.trim()) return null;
  const db = await getDb();
  const nameKey = cityName.trim().toLowerCase();
  const query: Record<string, unknown> = { nameKey, isActive: { $ne: false } };
  if (province && province.trim()) {
    Object.assign(query, getProvinceQueryFilter(province));
  }

  const exactDoc = await db
    .collection<CityLocationDoc>("locations")
    .findOne(query);

  if (!exactDoc) return null;

  return {
    name: exactDoc.name,
    nameKey: exactDoc.nameKey,
    province: exactDoc.province,
    provinceKey: exactDoc.provinceKey,
    areas: curatedAreaList(exactDoc.name, exactDoc.areas),
    isActive: exactDoc.isActive,
  };
}
