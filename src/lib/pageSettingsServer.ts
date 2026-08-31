import { getDb } from "@/lib/db";
import { normalizePageSettings, DEFAULT_PAGE_SETTINGS, PageSettings } from "@/lib/pageSettings";

export async function getGlobalPageSettings(): Promise<PageSettings> {
  try {
    const db = await getDb();
    const doc = await db.collection("page_settings").findOne({ key: "global_page_settings" });

    if (!doc) {
      return DEFAULT_PAGE_SETTINGS;
    }

    return normalizePageSettings(doc);
  } catch (error) {
    console.error("Error fetching page settings from server:", error);
    return DEFAULT_PAGE_SETTINGS;
  }
}
