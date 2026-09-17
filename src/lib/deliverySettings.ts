import { SHIPPING_FEE } from "@/lib/constants";

export type SocialLinks = {
  instagram?: string;
  facebook?: string;
  youtube?: string;
};

export type DeliverySettings = {
  feeEnabled: boolean;
  fee: number;
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

export function computeShipping(subtotal: number, settings: DeliverySettings): number {
  if (subtotal <= 0) return 0;
  if (!settings.feeEnabled) return 0;
  const fee = Number(settings.fee);
  return Number.isFinite(fee) && fee >= 0 ? fee : DEFAULT_DELIVERY_SETTINGS.fee;
}

/** Store promotion: delivery fee waived when admin turns off the fee toggle. */
export function isDeliveryPromoActive(settings: DeliverySettings, subtotal = 1): boolean {
  return subtotal > 0 && !settings.feeEnabled;
}
