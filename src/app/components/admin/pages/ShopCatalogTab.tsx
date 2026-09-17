"use client";

import React from "react";
import { Box, Typography, Paper, Grid, TextField, Button } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import type { PageSettings, PageSettingsKey } from "@/lib/pageSettings";
import BannerMediaRenderer from "@/app/components/ui/BannerMediaRenderer";
import SavePageButton from "./SavePageButton";

export interface ShopCatalogTabProps {
  settings: PageSettings;
  setSettings: React.Dispatch<React.SetStateAction<PageSettings>>;
  savingPage: PageSettingsKey | null;
  modalUploading: boolean;
  onOpenModal: (pageKey: PageSettingsKey, preferVideo?: boolean) => void;
  onSavePage: (page: PageSettingsKey) => Promise<boolean>;
}

export default function ShopCatalogTab({
  settings,
  setSettings,
  savingPage,
  modalUploading,
  onOpenModal,
  onSavePage,
}: ShopCatalogTabProps) {
  return (
    <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
          Shop Catalog Page Banner
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => onOpenModal("shop")}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Configure Banner
          </Button>
          <SavePageButton
            page="shop"
            savingPage={savingPage}
            modalUploading={modalUploading}
            onSave={onSavePage}
          />
        </Box>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Banner Heading"
            fullWidth
            value={settings.shop.bannerTitle}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                shop: { ...prev.shop, bannerTitle: e.target.value },
              }))
            }
            sx={{ mb: 2 }}
          />
          <TextField
            label="Banner Subtitle"
            fullWidth
            multiline
            rows={2}
            value={settings.shop.bannerSubtitle}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                shop: { ...prev.shop, bannerSubtitle: e.target.value },
              }))
            }
            sx={{ mb: 2 }}
          />
          <TextField
            label="Pagination (Items Per Page)"
            type="number"
            fullWidth
            value={settings.shop.productsPerPage}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                shop: { ...prev.shop, productsPerPage: Number(e.target.value) || 9 },
              }))
            }
            inputProps={{ min: 1, max: 48 }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Preview ({(settings.shop.bannerMedia?.type || settings.shop.bannerType || "image").toUpperCase()})
          </Typography>
          <Box sx={{ height: 160, borderRadius: 2, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <BannerMediaRenderer
              media={settings.shop.bannerMedia || { type: settings.shop.bannerType || "image", url: settings.shop.bannerImage || "" }}
              alt="Shop Banner"
              style={{ width: "100%", height: "100%" }}
            />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
