"use client";

import React from "react";
import { Box, Typography, Paper, Grid, TextField, Button } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import type { PageSettings, PageSettingsKey } from "@/lib/pageSettings";
import BannerMediaRenderer from "@/app/components/ui/BannerMediaRenderer";
import SavePageButton from "./SavePageButton";

export interface ContactTabProps {
  settings: PageSettings;
  setSettings: React.Dispatch<React.SetStateAction<PageSettings>>;
  savingPage: PageSettingsKey | null;
  modalUploading: boolean;
  onOpenModal: (pageKey: PageSettingsKey, preferVideo?: boolean) => void;
  onSavePage: (page: PageSettingsKey) => Promise<boolean>;
}

export default function ContactTab({
  settings,
  setSettings,
  savingPage,
  modalUploading,
  onOpenModal,
  onSavePage,
}: ContactTabProps) {
  return (
    <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
          Contact Page Banner
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => onOpenModal("contact")}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Configure Banner
          </Button>
          <SavePageButton
            page="contact"
            savingPage={savingPage}
            modalUploading={modalUploading}
            onSave={onSavePage}
          />
        </Box>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Heading"
            fullWidth
            value={settings.contact.bannerTitle}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                contact: { ...prev.contact, bannerTitle: e.target.value },
              }))
            }
            sx={{ mb: 2 }}
          />
          <TextField
            label="Subtitle"
            fullWidth
            multiline
            rows={2}
            value={settings.contact.bannerSubtitle}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                contact: { ...prev.contact, bannerSubtitle: e.target.value },
              }))
            }
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Preview
          </Typography>
          <Box sx={{ height: 160, borderRadius: 2, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <BannerMediaRenderer
              media={settings.contact.bannerMedia || { type: settings.contact.bannerType || "image", url: settings.contact.bannerImage || "" }}
              alt="Contact Banner"
              style={{ width: "100%", height: "100%" }}
            />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
