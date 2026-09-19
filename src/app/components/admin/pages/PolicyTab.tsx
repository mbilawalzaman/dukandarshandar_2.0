"use client";

import React from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  IconButton,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import type { PageSettings, PageSettingsKey, PolicySectionItem } from "@/lib/pageSettings";
import BannerMediaRenderer from "@/app/components/ui/BannerMediaRenderer";
import SavePageButton from "./SavePageButton";

export interface PolicyTabProps {
  pageKey: "privacy" | "terms" | "shipping" | "returns";
  pageTitle: string;
  settings: PageSettings;
  setSettings: React.Dispatch<React.SetStateAction<PageSettings>>;
  savingPage: PageSettingsKey | null;
  modalUploading: boolean;
  onOpenModal: (pageKey: PageSettingsKey, preferVideo?: boolean) => void;
  onSavePage: (page: PageSettingsKey) => Promise<boolean>;
}

export default function PolicyTab({
  pageKey,
  pageTitle,
  settings,
  setSettings,
  savingPage,
  modalUploading,
  onOpenModal,
  onSavePage,
}: PolicyTabProps) {
  const config = settings[pageKey];

  const handleAddSection = () => {
    const newSection: PolicySectionItem = {
      id: `sec-${Date.now()}`,
      title: "New Section",
      content: "",
    };
    setSettings((prev) => ({
      ...prev,
      [pageKey]: {
        ...prev[pageKey],
        sections: [...(prev[pageKey].sections || []), newSection],
      },
    }));
  };

  const handleRemoveSection = (sectionId: string) => {
    setSettings((prev) => ({
      ...prev,
      [pageKey]: {
        ...prev[pageKey],
        sections: (prev[pageKey].sections || []).filter((s) => s.id !== sectionId),
      },
    }));
  };

  const handleUpdateSection = (sectionId: string, field: "title" | "content", value: string) => {
    setSettings((prev) => ({
      ...prev,
      [pageKey]: {
        ...prev[pageKey],
        sections: (prev[pageKey].sections || []).map((s) =>
          s.id === sectionId ? { ...s, [field]: value } : s
        ),
      },
    }));
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const currentSections = [...(config.sections || [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentSections.length) return;

    const [moved] = currentSections.splice(index, 1);
    if (moved) {
      currentSections.splice(targetIndex, 0, moved);
      setSettings((prev) => ({
        ...prev,
        [pageKey]: {
          ...prev[pageKey],
          sections: currentSections,
        },
      }));
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Banner Configuration Card */}
      <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
            {pageTitle} Banner
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => onOpenModal(pageKey)}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Configure Banner
            </Button>
            <SavePageButton
              page={pageKey}
              savingPage={savingPage}
              modalUploading={modalUploading}
              onSave={onSavePage}
            />
          </Box>
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Banner Title"
              fullWidth
              value={config.bannerTitle || ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  [pageKey]: { ...prev[pageKey], bannerTitle: e.target.value },
                }))
              }
              sx={{ mb: 2 }}
            />
            <TextField
              label="Banner Subtitle"
              fullWidth
              multiline
              rows={2}
              value={config.bannerSubtitle || ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  [pageKey]: { ...prev[pageKey], bannerSubtitle: e.target.value },
                }))
              }
              sx={{ mb: 2 }}
            />
            <TextField
              label="Last Updated Text"
              fullWidth
              value={config.lastUpdated || ""}
              placeholder="e.g. September 2026"
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  [pageKey]: { ...prev[pageKey], lastUpdated: e.target.value },
                }))
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Banner Preview
            </Typography>
            <Box sx={{ height: 180, borderRadius: 2, overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <BannerMediaRenderer
                media={config.bannerMedia || { type: config.bannerType || "image", url: config.bannerImage || "" }}
                alt={`${pageTitle} Banner`}
                style={{ width: "100%", height: "100%" }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Policy Content Sections Card */}
      <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              Policy Content Sections ({config.sections?.length || 0})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add, edit, reorder, or delete sections for this policy page. Changes are updated dynamically on the storefront.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddSection}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
          >
            Add Section
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {(config.sections || []).map((sec, idx) => (
            <Card key={sec.id || idx} variant="outlined" sx={{ borderRadius: 2.5, p: 1 }}>
              <CardContent sx={{ pb: "16px !important" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b" }}>
                    Section {idx + 1}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton
                      size="small"
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, "up")}
                      aria-label="Move Up"
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={idx === (config.sections?.length || 0) - 1}
                      onClick={() => handleMoveSection(idx, "down")}
                      aria-label="Move Down"
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveSection(sec.id)}
                      aria-label="Delete Section"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Heading / Section Title"
                      fullWidth
                      size="small"
                      value={sec.title || ""}
                      onChange={(e) => handleUpdateSection(sec.id, "title", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Content / Paragraph Body"
                      fullWidth
                      multiline
                      rows={3}
                      size="small"
                      value={sec.content || ""}
                      onChange={(e) => handleUpdateSection(sec.id, "content", e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}

          {(!config.sections || config.sections.length === 0) && (
            <Box sx={{ textAlignment: "center", py: 4, color: "text.secondary" }}>
              <Typography variant="body2">No policy sections added yet. Click &quot;Add Section&quot; to create one.</Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
