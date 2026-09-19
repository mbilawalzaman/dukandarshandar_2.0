"use client";

import React from "react";
import { Box, Button, Grid, Paper, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StorefrontIcon from "@mui/icons-material/Storefront";
import QrCode2Icon from "@mui/icons-material/QrCode2";

interface LogoAndQRUploadSectionProps {
  storeLogo: string;
  qrCodeImage: string;
  onStoreLogoChange: (dataUrl: string) => void;
  onQRImageChange: (dataUrl: string) => void;
  onError: (msg: string) => void;
}

export default function LogoAndQRUploadSection({
  storeLogo,
  qrCodeImage,
  onStoreLogoChange,
  onQRImageChange,
  onError,
}: LogoAndQRUploadSectionProps) {
  const handleStoreLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onError("Store Logo image must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      onStoreLogoChange(String(reader.result || ""));
    };
  };

  const handleQRFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onError("QR Code image must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      onQRImageChange(String(reader.result || ""));
    };
  };

  return (
    <Grid container spacing={3}>
      {/* Storefront Logo Image */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3.5, borderRadius: 3, border: "1px solid #e2e8f0", height: "100%", display: "flex", flexDirection: "column" }} elevation={0}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <StorefrontIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Storefront Logo
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Upload your Company/Store Logo. Displayed on the Storefront Header/Navbar and printed shipping documents.
          </Typography>

          <Box
            sx={{
              width: 140,
              height: 140,
              borderRadius: 2,
              border: "2px dashed #cbd5e1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--theme-bg-default, #f8fafc)",
              overflow: "hidden",
              mb: 2.5,
              alignSelf: "flex-start",
            }}
          >
            {storeLogo ? (
              <Box
                component="img"
                src={storeLogo}
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
            {storeLogo && (
              <Button
                variant="text"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => onStoreLogoChange("")}
                sx={{ textTransform: "none" }}
              >
                Remove
              </Button>
            )}
          </Box>
        </Paper>
      </Grid>

      {/* Store QR Code Image */}
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

          <Box
            sx={{
              width: 140,
              height: 140,
              borderRadius: 2,
              border: "2px dashed #cbd5e1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--theme-bg-default, #f8fafc)",
              overflow: "hidden",
              mb: 2.5,
              alignSelf: "flex-start",
            }}
          >
            {qrCodeImage ? (
              <Box
                component="img"
                src={qrCodeImage}
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
            {qrCodeImage && (
              <Button
                variant="text"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => onQRImageChange("")}
                sx={{ textTransform: "none" }}
              >
                Remove
              </Button>
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}
