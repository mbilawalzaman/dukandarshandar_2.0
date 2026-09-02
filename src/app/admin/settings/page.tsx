"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

type DeliverySettingsForm = {
  feeEnabled: boolean;
  fee: number;
};

export default function AdminSettingsPage() {
  const [form, setForm] = useState<DeliverySettingsForm>({ feeEnabled: true, fee: 250 });
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
        });
      } else {
        setError(data.message || "Failed to load delivery settings.");
      }
    } catch {
      setError("Failed to load delivery settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const fee = Math.max(0, Number(form.fee) || 0);
    if (form.feeEnabled && fee <= 0) {
      setError("Enter a delivery fee greater than 0, or turn off the delivery fee toggle.");
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
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForm({
          feeEnabled: Boolean(data.settings.feeEnabled),
          fee: Number(data.settings.fee) || 0,
        });
        setSuccess("Delivery settings saved.");
      } else {
        setError(data.message || "Failed to save delivery settings.");
      }
    } catch {
      setError("Failed to save delivery settings.");
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
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage storefront delivery fee configuration.
      </Typography>

      <Paper sx={{ p: 4, borderRadius: 3, maxWidth: 640 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <LocalShippingIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Delivery Fee
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSave}>
          <FormControlLabel
            control={
              <Switch
                checked={form.feeEnabled}
                onChange={(e) => setForm((prev) => ({ ...prev, feeEnabled: e.target.checked }))}
              />
            }
            label="Apply delivery fee to orders"
            sx={{ mb: 2, display: "block" }}
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
            sx={{ mb: 3 }}
          />

          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
