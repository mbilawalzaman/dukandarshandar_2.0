"use client";

import React from "react";
import { Box, FormControlLabel, Paper, Switch, TextField, Typography } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

interface DeliveryFeeSectionProps {
  feeEnabled: boolean;
  fee: number;
  onFeeToggle: (enabled: boolean) => void;
  onFeeAmountChange: (amount: number) => void;
}

export default function DeliveryFeeSection({
  feeEnabled,
  fee,
  onFeeToggle,
  onFeeAmountChange,
}: DeliveryFeeSectionProps) {
  return (
    <Paper sx={{ p: 3.5, borderRadius: 3, border: "1px solid #e2e8f0", height: "100%", display: "flex", flexDirection: "column" }} elevation={0}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        <LocalShippingIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Delivery Fee
        </Typography>
      </Box>

      <FormControlLabel
        control={
          <Switch
            checked={feeEnabled}
            onChange={(e) => onFeeToggle(e.target.checked)}
          />
        }
        label="Apply delivery fee to orders"
        sx={{ mb: 1.5, display: "block" }}
      />

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {feeEnabled
          ? "Customers will be charged the delivery fee at checkout."
          : "Free delivery promotion is active, customers see “Free delivery on us” and pay PKR 0 for delivery."}
      </Typography>

      <TextField
        fullWidth
        type="number"
        label="Delivery fee (PKR)"
        value={fee === 0 ? "" : fee}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onFeeAmountChange(0);
            return;
          }
          const val = parseInt(raw, 10);
          if (!Number.isNaN(val) && val >= 0) {
            onFeeAmountChange(val);
          }
        }}
        inputProps={{ min: 0, step: 1 }}
        disabled={!feeEnabled}
        sx={{ maxWidth: 360, mt: "auto" }}
      />
    </Paper>
  );
}
