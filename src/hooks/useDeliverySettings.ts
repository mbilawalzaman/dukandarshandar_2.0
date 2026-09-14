"use client";

import { useEffect, useState } from "react";
import {
  computeShipping,
  DEFAULT_DELIVERY_SETTINGS,
  isDeliveryPromoActive,
  type DeliverySettings,
} from "@/lib/deliverySettings";

type PublicDeliverySettings = Pick<DeliverySettings, "feeEnabled" | "fee" | "qrCodeImage" | "whatsAppNumber" | "storeLogo" | "socialLinks">;

export function useDeliverySettings() {
  const [settings, setSettings] = useState<PublicDeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/settings/delivery")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.settings) {
          setSettings({
            feeEnabled: Boolean(data.settings.feeEnabled),
            fee: Number(data.settings.fee) || 0,
            qrCodeImage: data.settings.qrCodeImage || "",
            whatsAppNumber: data.settings.whatsAppNumber || "",
            storeLogo: data.settings.storeLogo || "",
            socialLinks: {
              instagram: data.settings.socialLinks?.instagram || "",
              facebook: data.settings.socialLinks?.facebook || "",
              youtube: data.settings.socialLinks?.youtube || "",
            },
          });
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

  const whatsAppDigits = (settings.whatsAppNumber || "").replace(/[^0-9]/g, "") || "";
  const whatsAppUrl = `https://wa.me/${whatsAppDigits}`;

  return { settings, loading, getShipping, isPromoActive, whatsAppUrl, whatsAppNumber: whatsAppDigits };
}
