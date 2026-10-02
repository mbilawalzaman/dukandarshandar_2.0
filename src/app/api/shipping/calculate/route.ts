import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import PostExService from "@/services/postex.service.js";

/**
 * Dynamic PostEx Delivery Charge Calculator API
 * Calculates verified shipping fee for 0.5kg parcels based on Destination Province & City
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { province = "", city = "" } = body;

    const destCity = (city || "").trim().toLowerCase();
    const destProvince = (province || "").trim().toLowerCase();

    // 1. Get Origin City from PostEx Merchant Warehouse Address
    let originCityName = "lahore";
    let originCityId = 1;

    try {
      const addressesRes = await PostExService.getPickupAddresses();
      const defaultAddr = Array.isArray(addressesRes?.dist)
        ? addressesRes.dist.find((a: { addressCode?: string }) => a.addressCode === "001") || addressesRes.dist[0]
        : null;

      if (defaultAddr?.cityName) {
        originCityName = defaultAddr.cityName.trim().toLowerCase();
      }
      if (defaultAddr?.cityId) {
        originCityId = Number(defaultAddr.cityId) || 1;
      }
    } catch (err) {
      console.warn("[Shipping Calculator] Failed to fetch merchant pickup address, fallback to Lahore:", err);
    }

    // 2. Determine Route Type based on Origin vs Destination
    const isSameCity = destCity.includes("lahore") || destCity === originCityName;
    const isSameProvince =
      destProvince.includes("punjab") ||
      (originCityName === "lahore" && (destProvince.includes("punjab") || isSameCity));

    let routeType: "SAME_CITY" | "SAME_PROVINCE_OTHER_CITY" | "OTHER_PROVINCE_OTHER_CITY" = "OTHER_PROVINCE_OTHER_CITY";
    let destinationCityId = 2; // Default inter-province city ID (Islamabad)

    if (isSameCity) {
      routeType = "SAME_CITY";
      destinationCityId = originCityId;
    } else if (isSameProvince) {
      routeType = "SAME_PROVINCE_OTHER_CITY";
      destinationCityId = 792; // PostEx ID for Punjab secondary city
    } else {
      routeType = "OTHER_PROVINCE_OTHER_CITY";
      destinationCityId = 2; // PostEx ID for inter-province
    }

    // 3. Try PostEx Live Calculator API with fixed 0.5kg parcel weight
    try {
      const postexRes = await fetch("https://postex.pk/api/delivery-charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originCityId,
          destinationCityId,
          weight: 0.5,
        }),
      });

      if (postexRes.ok) {
        const data = await postexRes.json();
        if (data.statusCode === "200" && data.dist) {
          const finalPrice = Math.round(Number(data.dist.finalPrice) || 200);
          return NextResponse.json({
            success: true,
            fee: finalPrice,
            rawPrice: data.dist.finalPrice,
            routeType: data.dist.routeType || routeType,
            details: {
              basePrice: data.dist.basePrice,
              fuelSurcharge: data.dist.fuelSurcharge,
              gst: data.dist.gst,
              finalPrice: data.dist.finalPrice,
            },
          });
        }
      }
    } catch (postexErr) {
      console.warn("[Shipping Calculator] PostEx public API request failed, using verified fallback rates:", postexErr);
    }

    // 4. Verified Fallback Tariffs for 0.5kg
    let fee = 274; // Other Province
    let basePrice = 175;
    let fuelSurcharge = 61.25;
    let gst = 37.8;
    let finalPrice = 274.05;

    if (routeType === "SAME_CITY") {
      fee = 157;
      basePrice = 100;
      fuelSurcharge = 35;
      gst = 21.6;
      finalPrice = 156.6;
    } else if (routeType === "SAME_PROVINCE_OTHER_CITY") {
      fee = 258;
      basePrice = 165;
      fuelSurcharge = 57.75;
      gst = 35.64;
      finalPrice = 258.39;
    }

    return NextResponse.json({
      success: true,
      fee,
      rawPrice: finalPrice,
      routeType,
      details: {
        basePrice,
        fuelSurcharge,
        gst,
        finalPrice,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Shipping calculator error:", err.message);
    return NextResponse.json({ success: false, fee: 200, error: err.message }, { status: 500 });
  }
}
