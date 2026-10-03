import { SHIPPING_FEE } from "@/lib/constants";
import type { ThemeKey } from "@/lib/themePresets";

export type SocialLinks = {
  instagram?: string;
  facebook?: string;
  youtube?: string;
};

export type DeliverySettings = {
  feeEnabled: boolean;
  fee: number;
  activeThemeKey?: ThemeKey;
  shopName?: string;
  shopPhone?: string;
  storeEmail?: string;
  shopAddress?: string;
  province?: string;
  city?: string;
  area?: string;
  address?: string;
  qrCodeImage?: string;
  whatsAppNumber?: string;
  storeLogo?: string;
  socialLinks?: SocialLinks;
  updatedAt?: Date;
  updatedBy?: string;
};

export const DELIVERY_SETTINGS_KEY = "delivery";

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  feeEnabled: true,
  fee: SHIPPING_FEE,
  activeThemeKey: "default",
  shopName: "",
  shopPhone: "",
  storeEmail: "",
  shopAddress: "",
  province: "",
  city: "",
  area: "",
  address: "",
  qrCodeImage: "",
  whatsAppNumber: "",
  storeLogo: "",
  socialLinks: {
    instagram: "",
    facebook: "",
    youtube: "",
  },
};

export type ShippingBreakdown = {
  rawFee: number;
  discount: number;
  finalFee: number;
  discountApplied: boolean;
};

export function computeShippingBreakdown(
  subtotal: number,
  settings: DeliverySettings,
  calculatedFee?: number | null,
): ShippingBreakdown {
  if (subtotal <= 0 || !settings.feeEnabled) {
    const raw =
      typeof calculatedFee === "number" && calculatedFee >= 0
        ? calculatedFee
        : DEFAULT_DELIVERY_SETTINGS.fee;

    return {
      rawFee: raw,
      discount: raw,
      finalFee: 0,
      discountApplied: false,
    };
  }

  const rawFee =
    typeof calculatedFee === "number" && calculatedFee >= 0
      ? calculatedFee
      : DEFAULT_DELIVERY_SETTINGS.fee;

  const discountAmount =
    Number.isFinite(Number(settings.fee)) && Number(settings.fee) > 0
      ? Number(settings.fee)
      : 0;

  const finalFee = Math.max(0, rawFee - discountAmount);
  const actualDiscount = Math.min(discountAmount, rawFee);
  const discountApplied = actualDiscount > 0 && finalFee < rawFee;

  return {
    rawFee,
    discount: actualDiscount,
    finalFee: Number.isFinite(finalFee) ? finalFee : 0,
    discountApplied,
  };
}

export function computeShipping(
  subtotal: number,
  settings: DeliverySettings,
  calculatedFee?: number | null,
): number {
  return computeShippingBreakdown(subtotal, settings, calculatedFee).finalFee;
}

/** Store promotion: delivery fee waived when admin turns off the fee toggle. */
export function isDeliveryPromoActive(
  settings: DeliverySettings,
  subtotal = 1,
): boolean {
  return subtotal > 0 && !settings.feeEnabled;
}
