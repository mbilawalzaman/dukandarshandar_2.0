"use client";

import React from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardActions,
  Chip,
  IconButton,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import VideocamIcon from "@mui/icons-material/Videocam";

import type {
  PageSettings,
  PageSettingsKey,
  HomeBannerMode,
} from "@/lib/pageSettings";
import { DEFAULT_PAGE_SETTINGS } from "@/lib/pageSettings";
import BannerMediaRenderer from "@/app/components/ui/BannerMediaRenderer";
import SavePageButton from "./SavePageButton";

export interface HomeTabProps {
  settings: PageSettings;
  setSettings: React.Dispatch<React.SetStateAction<PageSettings>>;
  savingPage: PageSettingsKey | null;
  modalUploading: boolean;
  slideImageUploads: Record<string, string>;
  onOpenModal: (pageKey: PageSettingsKey, preferVideo?: boolean) => void;
  onRemoveSlide: (slideId: string) => void;
  onReplaceSlideImage: (e: React.ChangeEvent<HTMLInputElement>, slideId: string) => void;
  onSavePage: (page: PageSettingsKey) => Promise<boolean>;
}

export default function HomeTab({
  settings,
  setSettings,
  savingPage,
  modalUploading,
  slideImageUploads,
  onOpenModal,
  onRemoveSlide,
  onReplaceSlideImage,
  onSavePage,
}: HomeTabProps) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                Home Banner Format
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use a multi-slide image carousel or a single MP4 video banner.
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                startIcon={<AddPhotoAlternateIcon />}
                onClick={() => onOpenModal("home", settings.home.bannerMode === "single_video")}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  backgroundColor: "#f59e0b",
                  color: "#1a1a1a",
                  "&:hover": { backgroundColor: "#d97706" },
                }}
              >
                {settings.home.bannerMode === "single_video" ? "+ Upload Video Banner" : "+ Add New Slide"}
              </Button>
              <SavePageButton
                page="home"
                savingPage={savingPage}
                modalUploading={modalUploading}
                onSave={onSavePage}
              />
            </Box>
          </Box>

          <RadioGroup
            row
            value={settings.home.bannerMode}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                home: {
                  ...prev.home,
                  bannerMode: e.target.value as HomeBannerMode,
                },
              }))
            }
            sx={{ mb: 3 }}
          >
            <FormControlLabel
              value="image_slider"
              control={<Radio />}
              label={
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  🖼️ Image Carousel Slideshow
                </Typography>
              }
            />
            <FormControlLabel
              value="single_video"
              control={<Radio />}
              label={
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  🎬 Single MP4 Video Banner
                </Typography>
              }
            />
          </RadioGroup>

          {settings.home.bannerMode === "single_video" ? (
            <Paper sx={{ p: 2.5, borderRadius: 2, border: "1px dashed #cbd5e1", bgcolor: "#fafafa" }} elevation={0}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#475569" }}>
                Active Single Video Banner
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={7}>
                  <Box sx={{ height: 220, borderRadius: 2, overflow: "hidden", border: "1px solid #e2e8f0", bgcolor: "#0f172a" }}>
                    <BannerMediaRenderer
                      media={settings.home.singleBanner?.activeMedia || { type: "video", url: "" }}
                      alt="Single Video Banner"
                      style={{ width: "100%", height: "100%" }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <TextField
                      label="Video Banner Title (Optional)"
                      size="small"
                      fullWidth
                      value={settings.home.singleBanner?.title || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings((prev) => ({
                          ...prev,
                          home: {
                            ...prev.home,
                            singleBanner: {
                              ...(prev.home.singleBanner || {
                                id: "single-banner-1",
                                order: 1,
                                isActive: true,
                                activeMedia: { type: "video", url: "" },
                              }),
                              title: val,
                            },
                          },
                        }));
                      }}
                    />
                    <TextField
                      label="Video Banner Subtitle (Optional)"
                      size="small"
                      fullWidth
                      value={settings.home.singleBanner?.subtitle || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings((prev) => ({
                          ...prev,
                          home: {
                            ...prev.home,
                            singleBanner: {
                              ...(prev.home.singleBanner || {
                                id: "single-banner-1",
                                order: 1,
                                isActive: true,
                                activeMedia: { type: "video", url: "" },
                              }),
                              subtitle: val,
                            },
                          },
                        }));
                      }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<VideocamIcon />}
                      onClick={() => onOpenModal("home", true)}
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      Replace MP4 Video
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          ) : (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "#475569" }}>
                Active Slides ({settings.home.banners.length})
              </Typography>
              <Grid container spacing={2}>
                {settings.home.banners.map((slide, idx) => {
                  return (
                    <Grid item xs={12} sm={6} md={4} key={slide.id}>
                      <Card sx={{ borderRadius: 2, border: "1px solid #e2e8f0" }} elevation={0}>
                        <Box sx={{ position: "relative", height: 140, bgcolor: "#0f172a" }}>
                          <BannerMediaRenderer
                            media={slideImageUploads[slide.id] ? { type: "image", url: slideImageUploads[slide.id]! } : slide.activeMedia}
                            alt={slide.title || `Slide #${idx + 1}`}
                            style={{ width: "100%", height: "100%" }}
                          />
                          <Chip
                            label={`Slide #${idx + 1}`}
                            size="small"
                            sx={{
                              position: "absolute",
                              top: 8,
                              left: 8,
                              bgcolor: "rgba(0,0,0,0.7)",
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          />
                        </Box>

                        <Box sx={{ p: 2 }}>
                          <TextField
                            label="Slide Title"
                            size="small"
                            fullWidth
                            value={slide.title || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettings((prev) => ({
                                ...prev,
                                home: {
                                  ...prev.home,
                                  banners: prev.home.banners.map((b) => (b.id === slide.id ? { ...b, title: val } : b)),
                                },
                              }));
                            }}
                            sx={{ mb: 1.5 }}
                          />
                          <TextField
                            label="GoTo Link / URL (Optional)"
                            size="small"
                            fullWidth
                            placeholder="e.g. /shop or https://..."
                            value={slide.goToLink || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettings((prev) => ({
                                ...prev,
                                home: {
                                  ...prev.home,
                                  banners: prev.home.banners.map((b) => (b.id === slide.id ? { ...b, goToLink: val } : b)),
                                },
                              }));
                            }}
                          />
                        </Box>

                        <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 1.5, pt: 0 }}>
                          <input
                            type="file"
                            id={`replace-img-${slide.id}`}
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => onReplaceSlideImage(e, slide.id)}
                          />
                          <label htmlFor={`replace-img-${slide.id}`}>
                            <Button component="span" size="small" startIcon={<CloudUploadIcon />} sx={{ textTransform: "none", fontSize: 12 }}>
                              {slideImageUploads[slide.id] ? "Image Pending Save" : "Replace Image"}
                            </Button>
                          </label>

                          <IconButton
                            size="small"
                            color="error"
                            disabled={settings.home.banners.length <= 1}
                            onClick={() => onRemoveSlide(slide.id)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </Paper>
      </Grid>

      {/* Quotas & Hero Section Features */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}>
            Storefront Quotas
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Top Rated Products Count"
                type="number"
                size="small"
                fullWidth
                value={settings.home.topRatedCount}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    home: { ...prev.home, topRatedCount: Number(e.target.value) || 4 },
                  }))
                }
                inputProps={{ min: 1, max: 24 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Catalog Products Per Page"
                type="number"
                size="small"
                fullWidth
                value={settings.home.productsPerPage}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    home: { ...prev.home, productsPerPage: Number(e.target.value) || 9 },
                  }))
                }
                inputProps={{ min: 1, max: 48 }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                Hero Section Features
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure the feature cards displayed below the home banner. Use {"{storeName}"} for dynamic store name.
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.home.heroSection?.enabled !== false}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      home: {
                        ...prev.home,
                        heroSection: {
                          ...(prev.home.heroSection || DEFAULT_PAGE_SETTINGS.home.heroSection!),
                          enabled: e.target.checked,
                        },
                      },
                    }))
                  }
                  color="primary"
                />
              }
              label={settings.home.heroSection?.enabled !== false ? "Enabled" : "Disabled"}
            />
          </Box>

          {settings.home.heroSection?.enabled !== false && (
            <Grid container spacing={2}>
              {(settings.home.heroSection?.features || DEFAULT_PAGE_SETTINGS.home.heroSection!.features).map((feat, idx) => (
                <Grid item xs={12} sm={6} md={3} key={feat.id || idx}>
                  <Card sx={{ p: 2, borderRadius: 2, border: "1px solid #e2e8f0" }} elevation={0}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#3b82f6" }}>
                      Feature #{idx + 1} ({feat.icon ? feat.icon.toUpperCase() : "FEATURE"})
                    </Typography>
                    <TextField
                      label="Title"
                      size="small"
                      fullWidth
                      value={feat.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setSettings((prev) => {
                          const cur = prev.home.heroSection?.features || DEFAULT_PAGE_SETTINGS.home.heroSection!.features;
                          const updated = [...cur];
                          updated[idx] = { ...updated[idx], title: newTitle };
                          return {
                            ...prev,
                            home: {
                              ...prev.home,
                              heroSection: {
                                ...(prev.home.heroSection || DEFAULT_PAGE_SETTINGS.home.heroSection!),
                                features: updated,
                              },
                            },
                          };
                        });
                      }}
                      sx={{ mb: 1.5 }}
                    />
                    <TextField
                      label="Description Line 1"
                      size="small"
                      fullWidth
                      multiline
                      rows={2}
                      value={feat.desc1}
                      onChange={(e) => {
                        const newDesc = e.target.value;
                        setSettings((prev) => {
                          const cur = prev.home.heroSection?.features || DEFAULT_PAGE_SETTINGS.home.heroSection!.features;
                          const updated = [...cur];
                          updated[idx] = { ...updated[idx], desc1: newDesc };
                          return {
                            ...prev,
                            home: {
                              ...prev.home,
                              heroSection: {
                                ...(prev.home.heroSection || DEFAULT_PAGE_SETTINGS.home.heroSection!),
                                features: updated,
                              },
                            },
                          };
                        });
                      }}
                      sx={{ mb: 1.5 }}
                    />
                    <TextField
                      label="Description Line 2"
                      size="small"
                      fullWidth
                      multiline
                      rows={2}
                      value={feat.desc2}
                      onChange={(e) => {
                        const newDesc = e.target.value;
                        setSettings((prev) => {
                          const cur = prev.home.heroSection?.features || DEFAULT_PAGE_SETTINGS.home.heroSection!.features;
                          const updated = [...cur];
                          updated[idx] = { ...updated[idx], desc2: newDesc };
                          return {
                            ...prev,
                            home: {
                              ...prev.home,
                              heroSection: {
                                ...(prev.home.heroSection || DEFAULT_PAGE_SETTINGS.home.heroSection!),
                                features: updated,
                              },
                            },
                          };
                        });
                      }}
                    />
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}
