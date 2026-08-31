import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { normalizePageSettings, DEFAULT_PAGE_SETTINGS } from "@/lib/pageSettings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    const normalized = normalizePageSettings(doc);

    return NextResponse.json({
      success: true,
      settings: normalized,
    });
  } catch (error) {
    console.error("Error fetching page settings:", error);
    return NextResponse.json({
      success: true,
      settings: DEFAULT_PAGE_SETTINGS,
    });
  }
}
