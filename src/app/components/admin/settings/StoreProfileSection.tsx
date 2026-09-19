"use client";

import React from "react";
import { Box, Grid, Paper, TextField, Typography } from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import PakistanLocationFields from "@/app/components/checkout/PakistanLocationFields";

interface StoreProfileSectionProps {
  shopName: string;
  shopPhone: string;
  storeEmail: string;
  province: string;
  city: string;
  area: string;
  address: string;
  onFieldChange: (field: string, value: string) => void;
  onLocationChange: (fields: { province?: string; city?: string; area?: string; address?: string }) => void;
}

export default function StoreProfileSection({
  shopName,
  shopPhone,
  storeEmail,
  province,
  city,
  area,
  address,
  onFieldChange,
  onLocationChange,
}: StoreProfileSectionProps) {
  return (
    <Paper sx={{ p: 3.5, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        <BusinessIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Store Management & Sender Address
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure your store name, contact phone, and sender location used on customer receipts and printed shipping labels.
      </Typography>

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Store / Business Name"
            value={shopName}
            onChange={(e) => onFieldChange("shopName", e.target.value)}
            placeholder="e.g. Store Name"
            helperText="Printed on receipts and shipping labels"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Store Contact Phone"
            value={shopPhone}
            onChange={(e) => onFieldChange("shopPhone", e.target.value)}
            placeholder="e.g. +92 300 8495148"
            helperText="Used as sender contact number"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="email"
            label="Store Email"
            value={storeEmail}
            onChange={(e) => onFieldChange("storeEmail", e.target.value)}
            placeholder="e.g. store@example.com"
            helperText="Official store contact & reply email"
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Store Address (Sender Origin for Shipping Labels)
          </Typography>
          <PakistanLocationFields
            values={{ province, city, area, address }}
            onChange={onLocationChange}
            required={false}
          />
        </Grid>
      </Grid>
    </Paper>
  );
}
