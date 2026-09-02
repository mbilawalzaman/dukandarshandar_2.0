"use client";

import { useEffect, useState } from "react";
import {
  computeShipping,
  DEFAULT_DELIVERY_SETTINGS,
  isDeliveryPromoActive,
  type DeliverySettings,
} from "@/lib/deliverySettings";

type PublicDeliverySettings = Pick<DeliverySettings, "feeEnabled" | "fee">;

export function useDeliverySettings() {
  const [settings, setSettings] = useState<PublicDeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/settings/delivery")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const getShipping = (subtotal: number) => computeShipping(subtotal, settings);

  const isPromoActive = (subtotal: number) => isDeliveryPromoActive(settings, subtotal);

  return { settings, loading, getShipping, isPromoActive };
}
