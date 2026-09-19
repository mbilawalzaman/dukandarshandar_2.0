import { getDb } from "@/lib/db";
import {
  DEFAULT_DELIVERY_SETTINGS,
  DELIVERY_SETTINGS_KEY,
  type DeliverySettings,
} from "@/lib/deliverySettings";
import { normalizeThemeKey } from "@/lib/themePresets";
import { safeNavigationHref } from "@/lib/safeNavigation";

export async function getDeliverySettings(): Promise<DeliverySettings> {
  const db = await getDb();
  const doc = await db.collection("settings").findOne({ key: DELIVERY_SETTINGS_KEY });

  if (!doc) return { ...DEFAULT_DELIVERY_SETTINGS };

  const fee = Number(doc.fee);
  return {
    feeEnabled: doc.feeEnabled !== false,
    fee: Number.isFinite(fee) && fee >= 0 ? fee : DEFAULT_DELIVERY_SETTINGS.fee,
    activeThemeKey: normalizeThemeKey(doc.activeThemeKey),
    shopName: typeof doc.shopName === "string" && doc.shopName.trim() ? doc.shopName.trim() : DEFAULT_DELIVERY_SETTINGS.shopName,
    shopPhone: typeof doc.shopPhone === "string" && doc.shopPhone.trim() ? doc.shopPhone.trim() : DEFAULT_DELIVERY_SETTINGS.shopPhone,
    storeEmail: typeof doc.storeEmail === "string" && doc.storeEmail.trim() ? doc.storeEmail.trim() : DEFAULT_DELIVERY_SETTINGS.storeEmail,
    shopAddress: typeof doc.shopAddress === "string" && doc.shopAddress.trim() ? doc.shopAddress.trim() : DEFAULT_DELIVERY_SETTINGS.shopAddress,
    province: typeof doc.province === "string" ? doc.province : DEFAULT_DELIVERY_SETTINGS.province,
    city: typeof doc.city === "string" ? doc.city : DEFAULT_DELIVERY_SETTINGS.city,
    area: typeof doc.area === "string" ? doc.area : DEFAULT_DELIVERY_SETTINGS.area,
    address: typeof doc.address === "string" ? doc.address : DEFAULT_DELIVERY_SETTINGS.address,
    qrCodeImage: typeof doc.qrCodeImage === "string" ? doc.qrCodeImage : DEFAULT_DELIVERY_SETTINGS.qrCodeImage,
    whatsAppNumber: typeof doc.whatsAppNumber === "string" && doc.whatsAppNumber.trim() ? doc.whatsAppNumber.trim() : DEFAULT_DELIVERY_SETTINGS.whatsAppNumber,
    storeLogo: typeof doc.storeLogo === "string" ? doc.storeLogo : DEFAULT_DELIVERY_SETTINGS.storeLogo,
    socialLinks: {
      instagram: typeof doc.socialLinks?.instagram === "string" ? doc.socialLinks.instagram.trim() : "",
      facebook: typeof doc.socialLinks?.facebook === "string" ? doc.socialLinks.facebook.trim() : "",
      youtube: typeof doc.socialLinks?.youtube === "string" ? doc.socialLinks.youtube.trim() : "",
    },
    updatedAt: doc.updated_at ? new Date(doc.updated_at) : undefined,
    updatedBy: doc.updated_by || undefined,
  };
}

export async function updateDeliverySettings(
  input: Partial<DeliverySettings>,
  updatedBy: string
): Promise<DeliverySettings> {
  const db = await getDb();
  if (input.fee !== undefined && (typeof input.fee !== "number" || !Number.isFinite(input.fee) || input.fee < 0)) {
    throw new Error("Invalid delivery fee");
  }
  if (input.feeEnabled !== undefined && typeof input.feeEnabled !== "boolean") throw new Error("Invalid delivery fee toggle");

  const setPayload: Record<string, unknown> = {
    key: DELIVERY_SETTINGS_KEY,
    ...(input.feeEnabled !== undefined ? { feeEnabled: input.feeEnabled } : {}),
    ...(input.fee !== undefined ? { fee: input.fee } : {}),
    updated_at: new Date(),
    updated_by: updatedBy,
  };

  if (input.activeThemeKey !== undefined) {
    setPayload.activeThemeKey = normalizeThemeKey(input.activeThemeKey);
  }

  if (typeof input.shopName === "string") {
    setPayload.shopName = input.shopName.trim();
  }
  if (typeof input.shopPhone === "string") {
    setPayload.shopPhone = input.shopPhone.trim();
  }
  if (typeof input.storeEmail === "string") {
    setPayload.storeEmail = input.storeEmail.trim();
  }
  if (typeof input.shopAddress === "string") {
    setPayload.shopAddress = input.shopAddress.trim();
  }
  if (typeof input.province === "string") {
    setPayload.province = input.province.trim();
  }
  if (typeof input.city === "string") {
    setPayload.city = input.city.trim();
  }
  if (typeof input.area === "string") {
    setPayload.area = input.area.trim();
  }
  if (typeof input.address === "string") {
    setPayload.address = input.address.trim();
  }

  if (typeof input.qrCodeImage === "string") {
    setPayload.qrCodeImage = input.qrCodeImage;
  }

  if (typeof input.whatsAppNumber === "string") {
    const cleaned = input.whatsAppNumber.replace(/[^0-9]/g, "");
    setPayload.whatsAppNumber = cleaned;
  }

  if (typeof input.storeLogo === "string") {
    setPayload.storeLogo = input.storeLogo;
  }

  if (input.socialLinks && typeof input.socialLinks === "object") {
    const instagram = safeNavigationHref(input.socialLinks.instagram);
    const facebook = safeNavigationHref(input.socialLinks.facebook);
    const youtube = safeNavigationHref(input.socialLinks.youtube);
    if ((input.socialLinks.instagram && !instagram) || (input.socialLinks.facebook && !facebook) || (input.socialLinks.youtube && !youtube)) {
      throw new Error("Social links must be HTTPS URLs");
    }
    setPayload.socialLinks = {
      instagram: instagram || "",
      facebook: facebook || "",
      youtube: youtube || "",
    };
  }

  await db.collection("settings").updateOne(
    { key: DELIVERY_SETTINGS_KEY },
    { $set: setPayload },
    { upsert: true }
  );

  return getDeliverySettings();
}
