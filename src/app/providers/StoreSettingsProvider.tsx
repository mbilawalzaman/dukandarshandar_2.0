"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_DELIVERY_SETTINGS,
  type DeliverySettings,
} from "@/lib/deliverySettings";
import { normalizeThemeKey } from "@/lib/themePresets";

interface StoreSettingsContextType {
  settings: DeliverySettings;
  loading: boolean;
  updateSettingsInState: (partial: Partial<DeliverySettings>) => void;
  refetchSettings: () => Promise<void>;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

export function StoreSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const revision = useRef(0);

  const fetchSettings = useCallback(async () => {
    const request = ++revision.current;
    try {
      const res = await fetch("/api/settings/delivery", { cache: "no-store" });
      const data = await res.json();
      if (request === revision.current && res.ok && data.success && data.settings) {
        setSettings({
          feeEnabled: Boolean(data.settings.feeEnabled),
          fee: Number(data.settings.fee) || 0,
          activeThemeKey: normalizeThemeKey(data.settings.activeThemeKey),
          shopName: data.settings.shopName || "",
          shopPhone: data.settings.shopPhone || "",
          storeEmail: data.settings.storeEmail || "",
          shopAddress: data.settings.shopAddress || "",
          province: data.settings.province || "",
          city: data.settings.city || "",
          area: data.settings.area || "",
          address: data.settings.address || "",
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
    } catch {
      // Keep default settings
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
    return () => { revision.current += 1; };
  }, [pathname, fetchSettings]);

  const updateSettingsInState = useCallback((partial: Partial<DeliverySettings>) => {
    revision.current += 1;
    setSettings((prev) => ({
      ...prev,
      ...partial,
      ...(partial.activeThemeKey !== undefined
        ? { activeThemeKey: normalizeThemeKey(partial.activeThemeKey) }
        : {}),
    }));
  }, []);

  return (
    <StoreSettingsContext.Provider
      value={{
        settings,
        loading,
        updateSettingsInState,
        refetchSettings: fetchSettings,
      }}
    >
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error("useStoreSettings must be used within a StoreSettingsProvider");
  }
  return context;
}

export function useSafeStoreSettings() {
  const context = useContext(StoreSettingsContext);
  return context ?? { settings: DEFAULT_DELIVERY_SETTINGS, loading: false };
}

export function getStoreInitials(shopName?: string, fallback = "DS"): string {
  const name = shopName?.trim();
  if (!name) return fallback;
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

