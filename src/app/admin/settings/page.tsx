"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  Paper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StorefrontIcon from "@mui/icons-material/Storefront";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import YouTubeIcon from "@mui/icons-material/YouTube";
import ShareIcon from "@mui/icons-material/Share";

type SettingsForm = {
  feeEnabled: boolean;
  fee: number;
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
  const [form, setForm] = useState<SettingsForm>({
    feeEnabled: true,
    fee: 250,
    qrCodeImage: "",
    whatsAppNumber: "",
    storeLogo: "",
    socialLinks: {
      instagram: "",
      facebook: "",
      youtube: "",
    },
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

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/settings/delivery");
      const data = await res.json();
      if (data.success && data.settings) {
        setForm({
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
      } else {
        setError(data.message || "Failed to load store settings.");
      }
    } catch {
      setError("Failed to load store settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleQRFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("QR Code image must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setForm((prev) => ({ ...prev, qrCodeImage: String(reader.result || "") }));
    };
  };

  const handleStoreLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Store Logo image must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setForm((prev) => ({ ...prev, storeLogo: String(reader.result || "") }));
    };
  };

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
          feeEnabled: form.feeEnabled,
          fee,
          qrCodeImage: form.qrCodeImage,
          whatsAppNumber: cleanWhatsApp,
          storeLogo: form.storeLogo,
          socialLinks: form.socialLinks,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForm({
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
        setSuccess("Store settings saved successfully.");
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

  const cleanWhatsAppNumber = form.whatsAppNumber.replace(/[^0-9]/g, "") || "";
  const generatedWhatsAppUrl = `https://wa.me/${cleanWhatsAppNumber}`;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: "#0f172a" }}>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage storefront delivery fee, QR code, and WhatsApp support configuration.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, maxWidth: 880 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3, maxWidth: 880 }}>
          {success}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSave}>
        <Grid container spacing={3} sx={{ maxWidth: 880 }}>
          {/* Card 1: Delivery Fee */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3.5, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
                <LocalShippingIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Delivery Fee
                </Typography>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={form.feeEnabled}
                    onChange={(e) => setForm((prev) => ({ ...prev, feeEnabled: e.target.checked }))}
                  />
                }
                label="Apply delivery fee to orders"
                sx={{ mb: 1.5, display: "block" }}
              />

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {form.feeEnabled
                  ? "Customers will be charged the delivery fee at checkout."
                  : "Free delivery promotion is active, customers see “Free delivery on us” and pay PKR 0 for delivery."}
              </Typography>

              <TextField
                fullWidth
                type="number"
                label="Delivery fee (PKR)"
                value={form.fee === 0 ? "" : form.fee}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setForm((prev) => ({ ...prev, fee: 0 }));
                    return;
                  }
                  const fee = parseInt(raw, 10);
                  if (!Number.isNaN(fee) && fee >= 0) {
                    setForm((prev) => ({ ...prev, fee }));
                  }
                }}
                inputProps={{ min: 0, step: 1 }}
                disabled={!form.feeEnabled}
                sx={{ maxWidth: 360 }}
              />
            </Paper>
          </Grid>

          {/* Card 2: Store Logo Image */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3.5, borderRadius: 3, border: "1px solid #e2e8f0", height: "100%", display: "flex", flexDirection: "column" }} elevation={0}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <StorefrontIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Storefront Logo
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Upload your Company/Store Logo. This logo will be displayed on the Storefront Header/Navbar and printed shipping documents.
              </Typography>

              {/* Store Logo Image Preview */}
              <Box
                sx={{
                  width: 140,
                  height: 140,
                  borderRadius: 2,
                  border: "2px dashed #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f8fafc",
                  overflow: "hidden",
                  mb: 2.5,
                  alignSelf: "flex-start",
                }}
              >
                {form.storeLogo ? (
                  <Box
                    component="img"
                    src={form.storeLogo}
                    alt="Store Logo"
                    sx={{ width: "100%", height: "100%", objectFit: "contain", p: 1 }}
                  />
                ) : (
                  <Box sx={{ textAlign: "center", p: 1 }}>
                    <StorefrontIcon sx={{ fontSize: 40, color: "#94a3b8", mb: 0.5 }} />
                    <Typography variant="caption" color="text.secondary" display="block">
                      No Logo uploaded
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ mt: "auto", display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} sx={{ textTransform: "none" }}>
                  Upload store logo
                  <input type="file" hidden accept="image/*" onChange={handleStoreLogoSelect} />
                </Button>
                {form.storeLogo && (
                  <Button
                    variant="text"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => setForm((prev) => ({ ...prev, storeLogo: "" }))}
                    sx={{ textTransform: "none" }}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Card 3: Store QR Code Image */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3.5, borderRadius: 3, border: "1px solid #e2e8f0", height: "100%", display: "flex", flexDirection: "column" }} elevation={0}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <QrCode2Icon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Store QR Code Image
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Upload your Store QR Code image used on printed shipping labels and customer payment receipts.
              </Typography>

              {/* QR Image Preview */}
              <Box
                sx={{
                  width: 140,
                  height: 140,
                  borderRadius: 2,
                  border: "2px dashed #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f8fafc",
                  overflow: "hidden",
                  mb: 2.5,
                  alignSelf: "flex-start",
                }}
              >
                {form.qrCodeImage ? (
                  <Box
                    component="img"
                    src={form.qrCodeImage}
                    alt="Store QR Code"
                    sx={{ width: "100%", height: "100%", objectFit: "contain", p: 1 }}
                  />
                ) : (
                  <Box sx={{ textAlign: "center", p: 1 }}>
                    <QrCode2Icon sx={{ fontSize: 40, color: "#94a3b8", mb: 0.5 }} />
                    <Typography variant="caption" color="text.secondary" display="block">
                      No QR uploaded
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ mt: "auto", display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} sx={{ textTransform: "none" }}>
                  Upload QR code
                  <input type="file" hidden accept="image/*" onChange={handleQRFileSelect} />
                </Button>
                {form.qrCodeImage && (
                  <Button
                    variant="text"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => setForm((prev) => ({ ...prev, qrCodeImage: "" }))}
                    sx={{ textTransform: "none" }}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Card 3: WhatsApp Support Number */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3.5, borderRadius: 3, border: "1px solid #e2e8f0", height: "100%", display: "flex", flexDirection: "column" }} elevation={0}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <WhatsAppIcon sx={{ color: "#25D366" }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  WhatsApp Support Number
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Enter the support WhatsApp number (country code + number, digits only). This number drives all live WhatsApp chat buttons across the storefront.
              </Typography>

              <TextField
                fullWidth
                label="WhatsApp number (Digits only)"
                value={form.whatsAppNumber}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, "");
                  setForm((prev) => ({ ...prev, whatsAppNumber: cleaned }));
                }}
                placeholder="e.g. "
                helperText="Format: Country code without '+' (e.g. 92 for Pakistan followed by number)"
                sx={{ mb: 2.5 }}
              />

              {/* Dynamic URL Preview Box */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  mt: "auto",
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
                  DYNAMIC WHATSAPP LINK PREVIEW:
                </Typography>
                <Typography
                  variant="body2"
                  component="a"
                  href={generatedWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: "#0284c7",
                    fontWeight: 700,
                    wordBreak: "break-all",
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {generatedWhatsAppUrl}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Card 5: Social Profiles */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3.5, borderRadius: 3, border: "1px solid #e2e8f0", height: "100%", display: "flex", flexDirection: "column" }} elevation={0}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <ShareIcon sx={{ color: "#e1306c" }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Social Profiles
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Instagram URL"
                  placeholder="https://instagram.com/yourhandle"
                  value={form.socialLinks.instagram}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, instagram: val },
                    }));
                  }}
                  InputProps={{
                    startAdornment: <InstagramIcon sx={{ color: "#E4405F", mr: 1, fontSize: 20 }} />,
                  }}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Facebook URL"
                  placeholder="https://facebook.com/yourpage"
                  value={form.socialLinks.facebook}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, facebook: val },
                    }));
                  }}
                  InputProps={{
                    startAdornment: <FacebookIcon sx={{ color: "#1877F2", mr: 1, fontSize: 20 }} />,
                  }}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="YouTube URL"
                  placeholder="https://youtube.com/@yourchannel"
                  value={form.socialLinks.youtube}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, youtube: val },
                    }));
                  }}
                  InputProps={{
                    startAdornment: <YouTubeIcon sx={{ color: "#FF0000", mr: 1, fontSize: 20 }} />,
                  }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{
                px: 4,
                py: 1.2,
                borderRadius: 2,
                fontWeight: 700,
                textTransform: "none",
                fontSize: "1rem",
                backgroundColor: "#0284c7",
                "&:hover": { backgroundColor: "#0369a1" },
              }}
            >
              {saving ? "Saving settings..." : "Save settings"}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
