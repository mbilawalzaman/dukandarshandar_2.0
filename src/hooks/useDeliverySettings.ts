"use client";
import { useCallback } from "react";
import { useStoreSettings } from "@/app/providers/StoreSettingsProvider";
import { computeShipping, isDeliveryPromoActive } from "@/lib/deliverySettings";

export function useDeliverySettings() {
  const { settings, loading } = useStoreSettings();
  const whatsAppDigits = (settings.whatsAppNumber || "").replace(/[^0-9]/g, "");

  const getShipping = useCallback(
    (subtotal: number, calculatedFee?: number | null) => computeShipping(subtotal, settings, calculatedFee),
    [settings]
  );

  const isPromoActive = useCallback(
    (subtotal = 1) => isDeliveryPromoActive(settings, subtotal),
    [settings]
  );

  return {
    settings,
    loading,
    getShipping,
    isPromoActive,
    whatsAppUrl: `https://wa.me/${whatsAppDigits}`,
    whatsAppNumber: whatsAppDigits,
  };
}
