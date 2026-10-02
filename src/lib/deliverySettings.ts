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

export function computeShipping(
  subtotal: number,
  settings: DeliverySettings,
  calculatedFee?: number | null
): number {
  if (subtotal <= 0) return 0;
  if (!settings.feeEnabled) return 0;

  const basePostExFee =
    typeof calculatedFee === "number" && calculatedFee >= 0
      ? calculatedFee
      : DEFAULT_DELIVERY_SETTINGS.fee;

  const discount = Number.isFinite(Number(settings.fee)) && Number(settings.fee) > 0 ? Number(settings.fee) : 0;
  const finalFee = Math.max(0, basePostExFee - discount);

  return Number.isFinite(finalFee) ? finalFee : 0;
}

/** Store promotion: delivery fee waived when admin turns off the fee toggle. */
export function isDeliveryPromoActive(settings: DeliverySettings, subtotal = 1): boolean {
  return subtotal > 0 && !settings.feeEnabled;
}
