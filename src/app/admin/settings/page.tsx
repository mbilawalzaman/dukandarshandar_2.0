"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Grid, Typography } from "@mui/material";
import { useMarketplaceTheme } from "@/app/providers/MarketplaceThemeProvider";
import { useStoreSettings } from "@/app/providers/StoreSettingsProvider";
import type { ThemeKey } from "@/lib/themePresets";
import { normalizeThemeKey } from "@/lib/themePresets";
import ThemeSelectorSection from "@/app/components/admin/settings/ThemeSelectorSection";
import StoreProfileSection from "@/app/components/admin/settings/StoreProfileSection";
import DeliveryFeeSection from "@/app/components/admin/settings/DeliveryFeeSection";
import WhatsAppSupportSection from "@/app/components/admin/settings/WhatsAppSupportSection";
import LogoAndQRUploadSection from "@/app/components/admin/settings/LogoAndQRUploadSection";
import SocialProfilesSection from "@/app/components/admin/settings/SocialProfilesSection";

type SettingsForm = {
  feeEnabled: boolean;
  fee: number;
  activeThemeKey: ThemeKey;
  shopName: string;
  shopPhone: string;
  storeEmail: string;
  shopAddress: string;
  province: string;
  city: string;
  area: string;
  address: string;
  qrCodeImage: string;
  whatsAppNumber: string;
  storeLogo: string;
  socialLinks: {
    instagram: string;
    facebook: string;
    youtube: string;
  };
};

export default function AdminSettingsPage() {
  const { previewThemeKey, setPreviewThemeKey, savedThemeKey } = useMarketplaceTheme();
  const { settings, loading: settingsLoading, updateSettingsInState } = useStoreSettings();

  const [form, setForm] = useState<SettingsForm>({
    feeEnabled: true,
    fee: 250,
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
    socialLinks: { instagram: "", facebook: "", youtube: "" },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const authHeaders = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const loadSettings = useCallback(() => {
    try {
      setLoading(true);
      setError("");
      const data = { success: true, settings, message: "" };
      if (data.success && data.settings) {
        setForm({
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
      } else {
        setError(data.message || "Failed to load store settings.");
      }
    } catch {
      setError("Failed to load store settings.");
    } finally {
      setLoading(false);
    }
  }, [settings]);

  useEffect(() => {
    if (!settingsLoading) loadSettings();
  }, [loadSettings, settingsLoading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const fee = Math.max(0, Number(form.fee) || 0);
    if (form.feeEnabled && fee <= 0) {
      setError("Enter a delivery fee greater than 0, or turn off the delivery fee toggle.");
      return;
    }

    const cleanWhatsApp = form.whatsAppNumber.replace(/[^0-9]/g, "");
    if (!cleanWhatsApp) {
      setError("Please enter a valid WhatsApp phone number (digits only).");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/settings/delivery", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          fee,
          shopName: form.shopName.trim(),
          shopPhone: form.shopPhone.trim(),
          storeEmail: form.storeEmail.trim(),
          shopAddress: form.shopAddress.trim(),
          province: form.province.trim(),
          city: form.city.trim(),
          area: form.area.trim(),
          address: form.address.trim(),
          whatsAppNumber: cleanWhatsApp,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedThemeKey = normalizeThemeKey(data.settings.activeThemeKey);
        updateSettingsInState({ ...data.settings, activeThemeKey: updatedThemeKey });
        setForm((previous) => ({ ...previous, ...data.settings, activeThemeKey: updatedThemeKey }));
        setPreviewThemeKey(null);
        setSuccess("Store settings and theme saved successfully.");
      } else {
        setError(data.message || "Failed to save store settings.");
      }
    } catch {
      setError("Failed to save store settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: "text.primary" }}>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your store profile, marketplace theme design, delivery details, and social links.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Box component="form" onSubmit={handleSave} sx={{ width: "100%" }}>
        <Grid container spacing={3} sx={{ width: "100%" }}>
          <Grid item xs={12}>
            <ThemeSelectorSection
              selectedThemeKey={form.activeThemeKey}
              previewThemeKey={previewThemeKey}
              onSelectTheme={(key) => {
                setForm((prev) => ({ ...prev, activeThemeKey: key }));
                setPreviewThemeKey(key);
              }}
              onClearPreview={() => {
                setPreviewThemeKey(null);
                setForm((previous) => ({ ...previous, activeThemeKey: savedThemeKey }));
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <StoreProfileSection
              shopName={form.shopName}
              shopPhone={form.shopPhone}
              storeEmail={form.storeEmail}
              province={form.province}
              city={form.city}
              area={form.area}
              address={form.address}
              onFieldChange={(field, val) => setForm((prev) => ({ ...prev, [field]: val }))}
              onLocationChange={(fields) => {
                setForm((prev) => {
                  const next = { ...prev, ...fields };
                  const parts = [next.address, next.area, next.city, next.province].filter(Boolean);
                  if (parts.length > 0) next.shopAddress = parts.join(", ");
                  return next;
                });
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <DeliveryFeeSection
              feeEnabled={form.feeEnabled}
              fee={form.fee}
              onFeeToggle={(enabled) => setForm((prev) => ({ ...prev, feeEnabled: enabled }))}
              onFeeAmountChange={(fee) => setForm((prev) => ({ ...prev, fee }))}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <WhatsAppSupportSection
              whatsAppNumber={form.whatsAppNumber}
              onNumberChange={(cleaned) => setForm((prev) => ({ ...prev, whatsAppNumber: cleaned }))}
            />
          </Grid>

          <Grid item xs={12}>
            <LogoAndQRUploadSection
              storeLogo={form.storeLogo}
              qrCodeImage={form.qrCodeImage}
              onStoreLogoChange={(logo) => setForm((prev) => ({ ...prev, storeLogo: logo }))}
              onQRImageChange={(qr) => setForm((prev) => ({ ...prev, qrCodeImage: qr }))}
              onError={setError}
            />
          </Grid>

          <Grid item xs={12}>
            <SocialProfilesSection
              socialLinks={form.socialLinks}
              onSocialChange={(platform, val) =>
                setForm((prev) => ({
                  ...prev,
                  socialLinks: { ...prev.socialLinks, [platform]: val },
                }))
              }
            />
          </Grid>

          <Grid item xs={12}>
            <Button type="submit" variant="contained" disabled={saving} sx={{ px: 4, py: 1.2, fontWeight: 700 }}>
              {saving ? "Saving settings..." : "Save settings"}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
