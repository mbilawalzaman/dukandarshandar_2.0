"use client";
import { useStoreSettings } from "@/app/providers/StoreSettingsProvider";
import { computeShipping, isDeliveryPromoActive } from "@/lib/deliverySettings";

export function useDeliverySettings() {
  const { settings, loading } = useStoreSettings();
  const whatsAppDigits = (settings.whatsAppNumber || "").replace(/[^0-9]/g, "");
  return {
    settings, loading,
    getShipping: (subtotal: number, calculatedFee?: number | null) => computeShipping(subtotal, settings, calculatedFee),
    isPromoActive: (subtotal = 1) => isDeliveryPromoActive(settings, subtotal),
    whatsAppUrl: `https://wa.me/${whatsAppDigits}`,
    whatsAppNumber: whatsAppDigits,
  };
}
