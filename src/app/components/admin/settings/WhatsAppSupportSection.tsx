"use client";

import React from "react";
import { Box, Paper, TextField, Typography } from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

interface WhatsAppSupportSectionProps {
  whatsAppNumber: string;
  onNumberChange: (cleanedDigits: string) => void;
}

export default function WhatsAppSupportSection({
  whatsAppNumber,
  onNumberChange,
}: WhatsAppSupportSectionProps) {
  const cleanDigits = whatsAppNumber.replace(/[^0-9]/g, "");
  const generatedWhatsAppUrl = `https://wa.me/${cleanDigits}`;

  return (
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
        value={whatsAppNumber}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^0-9]/g, "");
          onNumberChange(cleaned);
        }}
        placeholder="e.g. 923008495148"
        helperText="Format: Country code without '+' (e.g. 92 for Pakistan followed by number)"
        sx={{ mb: 2.5 }}
      />

      {/* Dynamic URL Preview Box */}
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          backgroundColor: "var(--theme-bg-default, #f1f5f9)",
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
            color: "var(--theme-primary-main, #0284c7)",
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
  );
}
