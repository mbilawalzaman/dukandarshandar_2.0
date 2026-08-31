import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { DEFAULT_PAGE_SETTINGS, PageSettings } from "@/lib/pageSettings";

export async function GET() {
  try {
    const db = await getDb();
    const doc = await db.collection("page_settings").findOne({ key: "global_page_settings" });

    if (!doc) {
      return NextResponse.json({
        success: true,
        settings: DEFAULT_PAGE_SETTINGS,
      });
    }

    const mergedSettings: PageSettings = {
      home: { ...DEFAULT_PAGE_SETTINGS.home, ...(doc.home || {}) },
      shop: { ...DEFAULT_PAGE_SETTINGS.shop, ...(doc.shop || {}) },
      about: { ...DEFAULT_PAGE_SETTINGS.about, ...(doc.about || {}) },
      contact: { ...DEFAULT_PAGE_SETTINGS.contact, ...(doc.contact || {}) },
    };

    return NextResponse.json({
      success: true,
      settings: mergedSettings,
    });
  } catch (error) {
    console.error("Error fetching page settings:", error);
    return NextResponse.json({
      success: true,
      settings: DEFAULT_PAGE_SETTINGS,
    });
  }
}
