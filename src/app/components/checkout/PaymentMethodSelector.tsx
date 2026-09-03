"use client";

import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
// import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
// import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import { BRAND } from "@/lib/constants";
import type { PaymentMethod } from "@/types/apps/paymentTypes";

export type { PaymentMethod };

interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Pay when your order arrives",
    icon: <LocalShippingOutlinedIcon />,
  },
  {
    id: "card",
    label: "Debit / Credit Card",
    description: "Pay securely on this page",
    icon: <CreditCardOutlinedIcon />,
  },
  // Raast & wallet require additional Safepay merchant authentication enable when configured.
  // {
  //   id: "raast",
  //   label: "Raast",
  //   description: "Instant bank transfer via Safepay",
  //   icon: <AccountBalanceOutlinedIcon />,
  // },
  // {
  //   id: "wallet",
  //   label: "Mobile Wallet",
  //   description: "JazzCash, easypaisa & more",
  //   icon: <AccountBalanceWalletOutlinedIcon />,
  // },
];

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}

export default function PaymentMethodSelector({ value, onChange, disabled }: PaymentMethodSelectorProps) {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: BRAND.navy }}>
        Payment method
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
        {PAYMENT_METHODS.map((method) => {
          const selected = value === method.id;
          return (
            <Paper
              key={method.id}
              component="button"
              type="button"
              disabled={disabled}
              onClick={() => onChange(method.id)}
              sx={{
                p: 2,
                textAlign: "left",
                cursor: disabled ? "not-allowed" : "pointer",
                border: "2px solid",
                borderColor: selected ? BRAND.gold : "#e2e8f0",
                backgroundColor: selected ? "#fffbeb" : "#ffffff",
                borderRadius: 2.5,
                opacity: disabled ? 0.6 : 1,
                transition: "border-color 0.2s ease, background-color 0.2s ease",
                "&:hover": disabled
                  ? {}
                  : {
                      borderColor: selected ? BRAND.gold : "#cbd5e1",
                    },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                <Box
                  sx={{
                    color: selected ? BRAND.goldDark : BRAND.navy,
                    display: "flex",
                    alignItems: "center",
                    mt: 0.25,
                  }}
                >
                  {method.icon}
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: BRAND.navy }}>
                    {method.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {method.description}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
