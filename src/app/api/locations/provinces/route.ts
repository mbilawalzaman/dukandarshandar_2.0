import { NextResponse } from "next/server";
import { listProvinces } from "@/services/locationService";

export async function GET() {
  try {
    const provinces = await listProvinces();
    return NextResponse.json(provinces, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error in GET /api/locations/provinces:", error);
    return NextResponse.json({ error: "Failed to fetch provinces" }, { status: 500 });
  }
}
