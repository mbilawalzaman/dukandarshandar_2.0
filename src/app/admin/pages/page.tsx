"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import ViewCarouselIcon from "@mui/icons-material/ViewCarousel";
import StorefrontIcon from "@mui/icons-material/Storefront";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ContactMailIcon from "@mui/icons-material/ContactMail";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveIcon from "@mui/icons-material/Save";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import MovieCreationIcon from "@mui/icons-material/MovieCreation";
import CollectionsIcon from "@mui/icons-material/Collections";
import VideocamIcon from "@mui/icons-material/Videocam";
import {
  DEFAULT_PAGE_SETTINGS,
  PageSettings,
  PageSettingsKey,
  BannerItem,
  HomeBannerMode,
  MediaAsset,
} from "@/lib/pageSettings";
import BannerMediaRenderer from "@/app/components/ui/BannerMediaRenderer";
import { uploadVideoToCloudinary } from "@/lib/cloudinaryClientUpload";

const PAGE_LABELS: Record<PageSettingsKey, string> = {
  home: "Home",
  shop: "Shop",
  about: "About",
  contact: "Contact",
};

export default function AdminManagePages() {
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingPage, setSavingPage] = useState<PageSettingsKey | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"image" | "video">("image");
  const [modalTargetPage, setModalTargetPage] = useState<PageSettingsKey>("home");
  const [modalMediaPayload, setModalMediaPayload] = useState("");
  const [modalMediaPreview, setModalMediaPreview] = useState("");
  const [modalVideoFile, setModalVideoFile] = useState<File | null>(null);
  const [modalUploading, setModalUploading] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState("");
  const [slideImageUploads, setSlideImageUploads] = useState<Record<string, string>>({});

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/admin/page-settings?t=${Date.now()}`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      } else {
        setToast({ open: true, message: "Failed to load page settings", severity: "error" });
      }
    } catch (err) {
      console.error("Error fetching page settings:", err);
      setToast({ open: true, message: "Failed to load page settings", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const savePage = async (page: PageSettingsKey, overrideSettings?: PageSettings) => {
    try {
      setSavingPage(page);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const current = overrideSettings || settings;

      let dataPayload: Record<string, unknown>;
      if (page === "home") {
        const single = current.home.singleBanner;
        const singleUrl = single?.activeMedia?.url || "";
        const singleIsVideo =
          single?.activeMedia?.type === "video" ||
          singleUrl.includes("/video/upload/") ||
          /\.(mp4|webm|mov)(\?|$)/i.test(singleUrl);
        dataPayload = {
          ...current.home,
          banners: current.home.banners.map((b) => {
            const pendingImg = slideImageUploads[b.id];
            if (pendingImg) {
              return { ...b, mediaUpload: pendingImg };
            }
            return b;
          }),
          singleBanner: single
            ? {
                ...single,
                ...(singleIsVideo
                  ? {
                      videoUrl: single.activeMedia.url,
                      videoPublicId: single.activeMedia.publicId,
                      videoFormat: single.activeMedia.format,
                    }
                  : {}),
              }
            : undefined,
        };
      } else {
        const pageSettings = current[page];
        dataPayload = {
          ...pageSettings,
          ...(pageSettings.bannerMedia?.type === "video"
            ? {
                videoUrl: pageSettings.bannerMedia.url,
                videoPublicId: pageSettings.bannerMedia.publicId,
                videoFormat: pageSettings.bannerMedia.format,
              }
            : {}),
        };
      }

      const res = await fetch("/api/admin/page-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ page, data: dataPayload }),
      });

      const raw = await res.text();
      let data: { success?: boolean; message?: string; settings?: PageSettings } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        setToast({
          open: true,
          message:
            res.status === 413
              ? "Upload is too large. Use Cloudinary direct upload for videos."
              : `Failed to save ${PAGE_LABELS[page]} (HTTP ${res.status})`,
          severity: "error",
        });
        return false;
      }

      if (res.ok && data.success && data.settings) {
        setSettings(data.settings);
        if (page === "home") setSlideImageUploads({});
        setToast({
          open: true,
          message: data.message || `${PAGE_LABELS[page]} settings saved`,
          severity: "success",
        });
        return true;
      }

      setToast({ open: true, message: data.message || "Failed to save settings", severity: "error" });
      return false;
    } catch (err) {
      console.error("Error saving page settings:", err);
      setToast({ open: true, message: "Network error while saving settings", severity: "error" });
      return false;
    } finally {
      setSavingPage(null);
    }
  };

  const clearModalMedia = () => {
    if (modalMediaPreview.startsWith("blob:")) URL.revokeObjectURL(modalMediaPreview);
    setModalMediaPayload("");
    setModalMediaPreview("");
    setModalVideoFile(null);
  };

  const handleOpenModal = (pageKey: PageSettingsKey, preferVideo = false) => {
    clearModalMedia();
    setModalTargetPage(pageKey);
    setModalType(preferVideo ? "video" : "image");
    setModalTitle("");
    setModalSubtitle("");
    setModalOpen(true);
  };

  const handleModalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (modalType === "video") {
      if (file.size > 25 * 1024 * 1024) {
        setToast({ open: true, message: "Video must be under 25MB", severity: "error" });
        return;
      }
      if (modalMediaPreview.startsWith("blob:")) URL.revokeObjectURL(modalMediaPreview);
      setModalVideoFile(file);
      setModalMediaPayload("");
      setModalMediaPreview(URL.createObjectURL(file));
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      setToast({ open: true, message: "Image must be under 6MB", severity: "error" });
      return;
    }

    setModalVideoFile(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      setModalMediaPayload(result);
      setModalMediaPreview(result);
    };
  };

  const handleModalSubmit = async () => {
    if (modalType === "video" && !modalVideoFile) {
      setToast({ open: true, message: "Please select a video file first", severity: "error" });
      return;
    }
    if (modalType === "image" && !modalMediaPayload) {
      setToast({ open: true, message: "Please select an image file first", severity: "error" });
      return;
    }

    try {
      let videoAsset: MediaAsset | null = null;
      if (modalType === "video" && modalVideoFile) {
        setModalUploading(true);
        setToast({ open: true, message: "Uploading video to Cloudinary…", severity: "info" });
        const uploaded = await uploadVideoToCloudinary(modalVideoFile);
        videoAsset = {
          type: "video",
          url: uploaded.url,
          publicId: uploaded.publicId,
          resourceType: "video",
          format: uploaded.format || "mp4",
          bytes: uploaded.bytes,
          duration: uploaded.duration,
        };
      }

      // Keep existing live banner until save succeeds — never swap in a static placeholder mid-upload.
      if (modalTargetPage === "home") {
        if (modalType === "image") {
          const nextIdx = settings.home.banners.length + 1;
          const newSlide: BannerItem = {
            id: `banner-${Date.now()}`,
            title: modalTitle.trim() || `Slide #${nextIdx}`,
            subtitle: modalSubtitle.trim() || "",
            order: nextIdx,
            isActive: true,
            activeMedia: { type: "image", url: modalMediaPayload },
            pendingMedia: null,
            processingStatus: "idle",
          };
          const nextSettings: PageSettings = {
            ...settings,
            home: {
              ...settings.home,
              bannerMode: "image_slider",
              banners: [...settings.home.banners, newSlide],
            },
          };
          setSlideImageUploads((prev) => ({ ...prev, [newSlide.id]: modalMediaPayload }));
          const ok = await savePage("home", nextSettings);
          if (ok) setModalOpen(false);
        } else if (videoAsset) {
          const homePayloadSettings: PageSettings = {
            ...settings,
            home: {
              ...settings.home,
              bannerMode: "single_video",
              singleBanner: {
                id: settings.home.singleBanner?.id || "single-banner-1",
                title: modalTitle.trim() || settings.home.singleBanner?.title || "Dukandar Shandar",
                subtitle: modalSubtitle.trim() || settings.home.singleBanner?.subtitle || "",
                order: 1,
                isActive: true,
                activeMedia: videoAsset,
                pendingMedia: null,
                processingStatus: "idle",
              },
            },
          };
          (homePayloadSettings.home.singleBanner as unknown as Record<string, unknown>).videoUrl = videoAsset.url;
          (homePayloadSettings.home.singleBanner as unknown as Record<string, unknown>).videoPublicId =
            videoAsset.publicId;
          (homePayloadSettings.home.singleBanner as unknown as Record<string, unknown>).videoFormat =
            videoAsset.format;

          const ok = await savePage("home", homePayloadSettings);
          if (ok) setModalOpen(false);
        }
      } else if (modalType === "video" && videoAsset) {
        const nextSettings = {
          ...settings,
          [modalTargetPage]: {
            ...settings[modalTargetPage],
            bannerType: "video",
            bannerImage: videoAsset.url,
            bannerMedia: videoAsset,
            videoUrl: videoAsset.url,
            videoPublicId: videoAsset.publicId,
            videoFormat: videoAsset.format,
          },
        } as PageSettings;
        const ok = await savePage(modalTargetPage, nextSettings);
        if (ok) setModalOpen(false);
      } else {
        const nextSettings: PageSettings = {
          ...settings,
          [modalTargetPage]: {
            ...settings[modalTargetPage],
            bannerType: "image",
            bannerImage: modalMediaPayload,
            bannerMedia: { type: "image", url: modalMediaPayload },
          },
        };
        const ok = await savePage(modalTargetPage, nextSettings);
        if (ok) setModalOpen(false);
      }
    } catch (err) {
      console.error("Error submitting banner media:", err);
      setToast({
        open: true,
        message: err instanceof Error ? err.message : "Failed to upload media",
        severity: "error",
      });
    } finally {
      setModalUploading(false);
    }
  };

  const handleRemoveSlide = (slideId: string) => {
    if (settings.home.banners.length <= 1) {
      setToast({ open: true, message: "At least one slide is required", severity: "error" });
      return;
    }
    setSettings((prev) => ({
      ...prev,
      home: {
        ...prev.home,
        banners: prev.home.banners.filter((b) => b.id !== slideId),
      },
    }));
    setSlideImageUploads((prev) => {
      const next = { ...prev };
      delete next[slideId];
      return next;
    });
  };

  const handleReplaceSlideImage = (e: React.ChangeEvent<HTMLInputElement>, slideId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      setToast({ open: true, message: "Image must be under 6MB", severity: "error" });
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setSlideImageUploads((prev) => ({ ...prev, [slideId]: reader.result as string }));
    };
  };

  const SavePageButton = ({ page }: { page: PageSettingsKey }) => (
    <Button
      variant="contained"
      startIcon={savingPage === page ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
      onClick={() => savePage(page)}
      disabled={savingPage !== null || modalUploading}
      sx={{
        borderRadius: 2,
        px: 3,
        py: 1.1,
        fontWeight: 700,
        textTransform: "none",
        backgroundColor: "#0284c7",
        "&:hover": { backgroundColor: "#0369a1" },
      }}
    >
      {savingPage === page ? "Saving..." : `Save ${PAGE_LABELS[page]}`}
    </Button>
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 350 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
          Page & Banner Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Edit each page separately. Image carousels or MP4 video banners upload directly to Cloudinary.
        </Typography>
      </Box>

      <Paper sx={{ borderRadius: 3, mb: 3, border: "1px solid #e2e8f0" }} elevation={0}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            "& .MuiTab-root": {
              fontWeight: 600,
              textTransform: "none",
              fontSize: "0.95rem",
              py: 2,
              minHeight: 48,
            },
          }}
        >
          <Tab icon={<ViewCarouselIcon />} iconPosition="start" label="Home Page Banner" />
          <Tab icon={<StorefrontIcon />} iconPosition="start" label="Shop Catalog Page" />
          <Tab icon={<InfoOutlinedIcon />} iconPosition="start" label="About Us Page" />
          <Tab icon={<ContactMailIcon />} iconPosition="start" label="Contact Page" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
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
                    onClick={() => handleOpenModal("home", settings.home.bannerMode === "single_video")}
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
                  <SavePageButton page="home" />
                </Box>
              </Box>

              <RadioGroup
                row
                value={settings.home.bannerMode || "image_slider"}
                onChange={(e) => {
                  const mode = e.target.value as HomeBannerMode;
                  setSettings((prev) => ({
                    ...prev,
                    home: { ...prev.home, bannerMode: mode },
                  }));
                }}
                sx={{ mb: 2 }}
              >
                <FormControlLabel
                  value="image_slider"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <CollectionsIcon sx={{ fontSize: 20, color: "#0284c7" }} />
                      <Typography sx={{ fontWeight: 600 }}>Image Carousel Slideshow</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="single_video"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <VideocamIcon sx={{ fontSize: 20, color: "#8b5cf6" }} />
                      <Typography sx={{ fontWeight: 600 }}>Single MP4 Video Banner</Typography>
                    </Box>
                  }
                />
              </RadioGroup>

              {settings.home.bannerMode !== "single_video" && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#475569", mb: 2 }}>
                    Active Slides ({settings.home.banners.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {settings.home.banners.map((slide, index) => {
                      const previewUrl = slideImageUploads[slide.id] || slide.activeMedia?.url || "";
                      return (
                        <Grid item xs={12} sm={6} md={4} key={slide.id}>
                          <Card sx={{ borderRadius: 2.5, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                            <Box sx={{ p: 1.5, display: "flex", justifyContent: "space-between", backgroundColor: "#f8fafc" }}>
                              <Chip label={`Slide #${index + 1}`} size="small" color="primary" sx={{ fontWeight: 700 }} />
                              <Chip label="IMAGE" size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: "0.7rem" }} />
                            </Box>
                            <Box sx={{ height: 160, position: "relative", backgroundColor: "#f1f5f9" }}>
                              {previewUrl ? (
                                <BannerMediaRenderer
                                  media={{ type: "image", url: previewUrl }}
                                  alt={slide.title || "Slide"}
                                  style={{ width: "100%", height: "100%" }}
                                />
                              ) : (
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                  <Typography variant="caption" color="text.secondary">
                                    No image
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                            <Box sx={{ p: 1.5 }}>
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
                                      banners: prev.home.banners.map((s) => (s.id === slide.id ? { ...s, title: val } : s)),
                                    },
                                  }));
                                }}
                              />
                            </Box>
                            <Divider />
                            <CardActions sx={{ justifyContent: "space-between", px: 1.5, py: 1 }}>
                              <input
                                type="file"
                                id={`replace-${slide.id}`}
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => handleReplaceSlideImage(e, slide.id)}
                              />
                              <label htmlFor={`replace-${slide.id}`}>
                                <Button component="span" size="small" variant="outlined" sx={{ textTransform: "none", fontSize: "0.75rem" }}>
                                  Replace Image
                                </Button>
                              </label>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveSlide(slide.id)}
                                disabled={settings.home.banners.length <= 1}
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

              {settings.home.bannerMode === "single_video" && (
                <Box sx={{ mt: 2, p: 2.5, backgroundColor: "#f8fafc", borderRadius: 3, border: "1px solid #e2e8f0" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Single Video Banner
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Plays as MP4 on all devices (including iPhone). Existing video stays until the new one is saved — no static placeholder.
                      </Typography>
                    </Box>
                    <Chip
                      label={modalUploading || savingPage === "home" ? "UPLOADING" : "LIVE"}
                      color={modalUploading || savingPage === "home" ? "warning" : "success"}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  {(() => {
                    const live = settings.home.singleBanner?.activeMedia;
                    const liveUrl = live?.url || "";
                    const isLiveVideo =
                      Boolean(liveUrl) &&
                      (live?.type === "video" ||
                        liveUrl.includes("/video/upload/") ||
                        /\.(mp4|webm|mov)(\?|$)/i.test(liveUrl));
                    const busy = modalUploading || savingPage === "home";
                    return (
                      <Box
                        sx={{
                          position: "relative",
                          height: 260,
                          borderRadius: 2.5,
                          overflow: "hidden",
                          backgroundColor: "#0f172a",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isLiveVideo ? (
                          <BannerMediaRenderer
                            media={live}
                            alt={settings.home.singleBanner?.title || "Home Video Banner"}
                            style={{ width: "100%", height: "100%" }}
                          />
                        ) : (
                          <Typography variant="body2" sx={{ color: "#94a3b8", px: 2, textAlign: "center" }}>
                            No video banner yet. Upload an MP4 to go live.
                          </Typography>
                        )}
                        {busy && (
                          <Box
                            sx={{
                              position: "absolute",
                              inset: 0,
                              bgcolor: "rgba(15, 23, 42, 0.45)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 2,
                            }}
                          >
                            <CircularProgress size={36} sx={{ color: "#febe4c" }} />
                          </Box>
                        )}
                      </Box>
                    );
                  })()}
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<MovieCreationIcon />}
                      onClick={() => handleOpenModal("home", true)}
                      disabled={modalUploading || savingPage !== null}
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      Upload New MP4 / MOV / WebM
                    </Button>
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
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
        </Grid>
      )}

      {activeTab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              Shop Catalog Page Banner
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => handleOpenModal("shop")}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Configure Banner
              </Button>
              <SavePageButton page="shop" />
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
      )}

      {activeTab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              About Us Page Banner
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => handleOpenModal("about")}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Configure Banner
              </Button>
              <SavePageButton page="about" />
            </Box>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Heading"
                fullWidth
                value={settings.about.bannerTitle}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    about: { ...prev.about, bannerTitle: e.target.value },
                  }))
                }
                sx={{ mb: 2 }}
              />
              <TextField
                label="Subtitle"
                fullWidth
                multiline
                rows={2}
                value={settings.about.bannerSubtitle}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    about: { ...prev.about, bannerSubtitle: e.target.value },
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
                  media={settings.about.bannerMedia || { type: settings.about.bannerType || "image", url: settings.about.bannerImage || "" }}
                  alt="About Banner"
                  style={{ width: "100%", height: "100%" }}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {activeTab === 3 && (
        <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              Contact Page Banner
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => handleOpenModal("contact")}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Configure Banner
              </Button>
              <SavePageButton page="contact" />
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
      )}

      <Dialog
        open={modalOpen}
        onClose={() => !modalUploading && setModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {modalType === "video" ? "Upload Video Banner" : "Add Banner Media"} ({PAGE_LABELS[modalTargetPage]})
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#475569" }}>
              Media type
            </Typography>
            <RadioGroup
              row
              value={modalType}
              onChange={(e) => {
                clearModalMedia();
                setModalType(e.target.value as "image" | "video");
              }}
            >
              <FormControlLabel
                value="image"
                control={<Radio />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CollectionsIcon sx={{ fontSize: 18, color: "#0284c7" }} />
                    <Typography sx={{ fontWeight: 600 }}>Image</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="video"
                control={<Radio />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <MovieCreationIcon sx={{ fontSize: 18, color: "#8b5cf6" }} />
                    <Typography sx={{ fontWeight: 600 }}>MP4 Video</Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>

          <Box sx={{ mb: 3 }}>
            <input
              type="file"
              id="modal-file-upload"
              accept={modalType === "video" ? "video/mp4,video/quicktime,video/webm" : "image/*"}
              style={{ display: "none" }}
              onChange={handleModalFileSelect}
            />
            <label htmlFor="modal-file-upload" style={{ width: "100%", display: "block" }}>
              <Button
                component="span"
                variant="outlined"
                fullWidth
                startIcon={<CloudUploadIcon />}
                disabled={modalUploading}
                sx={{ py: 1.5, textTransform: "none", fontWeight: 700 }}
              >
                {modalVideoFile || modalMediaPayload
                  ? "Change Selected File"
                  : `Browse ${modalType === "video" ? "MP4 / MOV / WebM" : "Image"}`}
              </Button>
            </label>
            {modalMediaPreview && modalType === "video" && (
              <Box sx={{ mt: 2, height: 180, borderRadius: 2, overflow: "hidden", bgcolor: "#0f172a" }}>
                <Box component="video" src={modalMediaPreview} controls muted playsInline sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </Box>
            )}
            {modalMediaPreview && modalType === "image" && (
              <Box sx={{ mt: 2, height: 180, borderRadius: 2, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                <Box component="img" src={modalMediaPreview} alt="Preview" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Box>
            )}
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Banner Title (Optional)" size="small" fullWidth value={modalTitle} onChange={(e) => setModalTitle(e.target.value)} />
            <TextField label="Banner Subtitle (Optional)" size="small" fullWidth value={modalSubtitle} onChange={(e) => setModalSubtitle(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setModalOpen(false)} disabled={modalUploading} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleModalSubmit}
            disabled={
              modalUploading ||
              savingPage !== null ||
              (modalType === "video" ? !modalVideoFile : !modalMediaPayload)
            }
            startIcon={modalUploading ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", fontWeight: 700, backgroundColor: "#0284c7", "&:hover": { backgroundColor: "#0369a1" } }}
          >
            {modalUploading
              ? "Uploading…"
              : modalType === "video"
                ? "Upload & Activate Video"
                : modalTargetPage === "home"
                  ? "Add Image Slide"
                  : "Upload & Save Image"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((prev) => ({ ...prev, open: false }))} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
