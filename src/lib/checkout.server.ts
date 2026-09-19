import { createHash } from "crypto";
import { CheckoutError, type validateCheckout } from "@/lib/checkoutValidation";
import { getLocationByCity, listAreas, listProvinces } from "@/services/locationService";

export async function validateShippingLocation(body: ReturnType<typeof validateCheckout>) {
  const provinces = await listProvinces();
  if (!provinces.some((p) => p.toLowerCase() === body.province.toLowerCase())) throw new CheckoutError("Select a supported province");
  const city = await getLocationByCity(body.city, body.province);
  if (!city) throw new CheckoutError("Select a supported city in this province");
  const areas = await listAreas(body.city, body.province);
  if (areas.length && !areas.some((a) => a.toLowerCase() === body.area.toLowerCase())) throw new CheckoutError("Select a supported area in this city");
}

export function checkoutIdentity(req: Request, owner: string, body: unknown) {
  const key = req.headers.get("idempotency-key");
  if (!key || !/^[a-zA-Z0-9_-]{16,128}$/.test(key)) throw new CheckoutError("Missing or invalid checkout request key");
  return {
    id: createHash("sha256").update(`${owner}:${key}`).digest("hex").slice(0, 24),
    fingerprint: createHash("sha256").update(JSON.stringify(body)).digest("hex"),
  };
}
