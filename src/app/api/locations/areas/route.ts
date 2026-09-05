import { NextResponse } from "next/server";
import { listAreas } from "@/services/locationService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || "";
    const province = searchParams.get("province") || undefined;
    const areas = await listAreas(city, province);
    return NextResponse.json(
      {
        city,
        areas,
        hasCuratedAreas: areas.length > 0,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error in GET /api/locations/areas:", error);
    return NextResponse.json({ error: "Failed to fetch areas" }, { status: 500 });
  }
}
