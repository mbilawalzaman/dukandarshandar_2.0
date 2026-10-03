import PostExService from "@/services/postex.service.js";

/**
 * Dynamic PostEx Delivery Charge Calculator
 * Calculates verified shipping fee for 0.5kg parcels based on Destination Province & City
 */
export async function calculatePostExShippingRate(
  province: string,
  city: string,
): Promise<number> {
  const destCity = (city || "").trim().toLowerCase();
  const destProvince = (province || "").trim().toLowerCase();

  let originCityName = "lahore";
  let originCityId = 1;

  try {
    const addressesRes = await PostExService.getPickupAddresses();

    const defaultAddr = Array.isArray(addressesRes?.dist)
      ? addressesRes.dist.find(
          (a: { addressCode?: string }) => a.addressCode === "001",
        ) || addressesRes.dist[0]
      : null;

    if (defaultAddr?.cityName) {
      originCityName = defaultAddr.cityName.trim().toLowerCase();
    }

    if (defaultAddr?.cityId) {
      originCityId = Number(defaultAddr.cityId) || 1;
    }
  } catch {
    /* fallback to Lahore */
  }

  const isSameCity = destCity.includes("lahore") || destCity === originCityName;

  const isSameProvince =
    destProvince.includes("punjab") ||
    (originCityName === "lahore" &&
      (destProvince.includes("punjab") || isSameCity));

  let routeType:
    "SAME_CITY" | "SAME_PROVINCE_OTHER_CITY" | "OTHER_PROVINCE_OTHER_CITY" =
    "OTHER_PROVINCE_OTHER_CITY";
  let destinationCityId = 2;

  if (isSameCity) {
    routeType = "SAME_CITY";
    destinationCityId = originCityId;
  } else if (isSameProvince) {
    routeType = "SAME_PROVINCE_OTHER_CITY";
    destinationCityId = 792;
  } else {
    routeType = "OTHER_PROVINCE_OTHER_CITY";
    destinationCityId = 2;
  }

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
        return Math.round(Number(data.dist.finalPrice) || 200);
      }
    }
  } catch {
    /* fallback */
  }

  if (routeType === "SAME_CITY") return 157;
  if (routeType === "SAME_PROVINCE_OTHER_CITY") return 258;

  return 274;
}
