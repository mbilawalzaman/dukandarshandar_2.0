"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
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
  Alert,
  CircularProgress,
  Snackbar,
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
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import AnimationIcon from "@mui/icons-material/Animation";
import CollectionsIcon from "@mui/icons-material/Collections";
import { DEFAULT_PAGE_SETTINGS, PageSettings, BannerItem } from "@/lib/pageSettings";
import BannerMediaRenderer from "@/app/components/ui/BannerMediaRenderer";
import { uploadVideoToCloudinary } from "@/lib/cloudinaryClientUpload";

export default function AdminManagePages() {
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Modal State for Adding New Banner / Video
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"image" | "video">("image");
  const [modalTargetPage, setModalTargetPage] = useState<"home" | "shop" | "about" | "contact">("home");
  const [modalMediaPayload, setModalMediaPayload] = useState<string>("");
  const [modalMediaPreview, setModalMediaPreview] = useState<string>("");
  const [modalVideoFile, setModalVideoFile] = useState<File | null>(null);
  const [modalUploading, setModalUploading] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState("");

  // Track pending image uploads for existing slides: slideId -> base64
  const [slideImageUploads, setSlideImageUploads] = useState<Record<string, string>>({});

  // Track in-flight request lock to prevent pile-up
  const isFetchingRef = useRef(false);

  const isVideoProcessing =
    settings.home?.singleBanner?.processingStatus === "processing" ||
    settings.home?.banners?.some((b) => b.processingStatus === "processing") ||
    false;

  const fetchSettings = useCallback(async (isPolling = false) => {
    // Guard: never send a new request if one is already pending/in-flight
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s safety timeout

    try {
      if (!isPolling) setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/admin/page-settings?t=${Date.now()}`, {
        cache: "no-store",
        signal: controller.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings((prev) => {
          if (isPolling) {
            const wasProcessing =
              prev.home?.singleBanner?.processingStatus === "processing" ||
              prev.home?.banners?.some((b) => b.processingStatus === "processing");
            const nowProcessing =
              data.settings.home?.singleBanner?.processingStatus === "processing" ||
              data.settings.home?.banners?.some((b: BannerItem) => b.processingStatus === "processing");

            if (wasProcessing && !nowProcessing) {
              setToast({
                open: true,
                message: "Video conversion to Lottie JSON completed! Banner updated live.",
                severity: "success",
              });
            }
          }
          return data.settings;
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        console.warn("Page settings request timed out or was aborted");
      } else {
        console.error("Error fetching page settings:", err);
      }
      if (!isPolling) {
        setToast({ open: true, message: "Failed to load page settings", severity: "error" });
      }
    } finally {
      clearTimeout(timeoutId);
      isFetchingRef.current = false;
      if (!isPolling) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Sequential Polling: Schedules next request ONLY after previous request finishes
  useEffect(() => {
    if (!isVideoProcessing) return;

    let timerId: NodeJS.Timeout;
    let isMounted = true;

    const runSequentialPoll = async () => {
      await fetchSettings(true);
      if (isMounted && isVideoProcessing) {
        timerId = setTimeout(runSequentialPoll, 3000); // Wait 3s after resolution before next poll
      }
    };

    timerId = setTimeout(runSequentialPoll, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [isVideoProcessing, fetchSettings]);

  const handleSave = async (updatedSettingsOverride?: PageSettings) => {
    try {
      setSaving(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const currentSettings = updatedSettingsOverride || settings;

      // Merge pending slide image uploads
      const payload: PageSettings = {
        ...currentSettings,
        home: {
          ...currentSettings.home,
          banners: currentSettings.home.banners.map((b) => {
            const pendingImg = slideImageUploads[b.id];
            if (pendingImg) {
              return {
                ...b,
                ...({ mediaUpload: pendingImg } as unknown as BannerItem),
              };
            }
            return b;
          }),
        },
      };

      const res = await fetch("/api/admin/page-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
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
              ? "Upload is too large for the server. Videos must be uploaded via Cloudinary first."
              : `Failed to save settings (HTTP ${res.status})`,
          severity: "error",
        });
        return;
      }

      if (res.ok && data.success) {
        setSettings(data.settings!);
        setSlideImageUploads({});
        setToast({
          open: true,
          message: "Page settings saved successfully!",
          severity: "success",
        });
      } else {
        setToast({ open: true, message: data.message || "Failed to save settings", severity: "error" });
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      setToast({ open: true, message: "Network error while saving settings", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Open Modal to Add New Banner or Video
  const handleOpenModal = (pageKey: "home" | "shop" | "about" | "contact") => {
    if (modalMediaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(modalMediaPreview);
    }
    setModalTargetPage(pageKey);
    setModalType("image");
    setModalMediaPayload("");
    setModalMediaPreview("");
    setModalVideoFile(null);
    setModalTitle("");
    setModalSubtitle("");
    setModalOpen(true);
  };

  // Handle Modal File Upload
  const handleModalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (modalType === "video") {
      if (file.size > 25 * 1024 * 1024) {
        setToast({ open: true, message: "Video must be under 25MB", severity: "error" });
        return;
      }
      if (modalMediaPreview.startsWith("blob:")) {
        URL.revokeObjectURL(modalMediaPreview);
      }
      const previewUrl = URL.createObjectURL(file);
      setModalVideoFile(file);
      setModalMediaPayload("");
      setModalMediaPreview(previewUrl);
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

  // Submit Modal Action
  const handleModalSubmit = async () => {
    if (modalType === "video" && !modalVideoFile) {
      setToast({ open: true, message: "Please select a video file first", severity: "error" });
      return;
    }
    if (modalType === "image" && !modalMediaPayload) {
      setToast({ open: true, message: "Please select an image or video file first", severity: "error" });
      return;
    }

    try {
      let videoUrl = "";
      if (modalType === "video" && modalVideoFile) {
        setModalUploading(true);
        setToast({
          open: true,
          message: "Uploading video to Cloudinary…",
          severity: "info",
        });
        const uploaded = await uploadVideoToCloudinary(modalVideoFile);
        videoUrl = uploaded.url;
      }

      if (modalTargetPage === "home") {
        if (modalType === "image") {
          const nextIdx = settings.home.banners.length + 1;
          const newSlide: BannerItem = {
            id: `banner-${Date.now()}`,
            title: modalTitle.trim() || `Slide #${nextIdx}`,
            subtitle: modalSubtitle.trim() || "",
            order: nextIdx,
            isActive: true,
            activeMedia: {
              type: "image",
              url: modalMediaPayload,
            },
            pendingMedia: null,
            processingStatus: "idle",
          };

          const updated: PageSettings = {
            ...settings,
            home: {
              ...settings.home,
              bannerMode: "image_slider",
              banners: [...settings.home.banners, newSlide],
            },
          };

          setSlideImageUploads((prev) => ({ ...prev, [newSlide.id]: modalMediaPayload }));
          setModalOpen(false);
          await handleSave(updated);
        } else {
          const currentActiveMedia =
            settings.home.singleBanner?.activeMedia?.url
              ? settings.home.singleBanner.activeMedia
              : settings.home.banners.find((b) => b.isActive !== false && b.activeMedia?.url)?.activeMedia ||
                settings.home.banners[0]?.activeMedia || {
                  type: "image" as const,
                  url: "",
                };

          const updated = {
            ...settings,
            home: {
              ...settings.home,
              bannerMode: "single_lottie" as const,
              singleBanner: {
                id: "single-banner-1",
                title: modalTitle.trim() || settings.home.singleBanner?.title || "Dukandar Shandar",
                subtitle: modalSubtitle.trim() || settings.home.singleBanner?.subtitle || "",
                order: 1,
                isActive: true,
                activeMedia: currentActiveMedia,
                pendingMedia: null,
                processingStatus: "processing" as const,
                videoUrl,
              },
            },
          };

          setModalOpen(false);
          await handleSave(updated as unknown as PageSettings);
          setToast({
            open: true,
            message:
              "Video conversion to Lottie is in progress. Your current banner will remain live until processing finishes.",
            severity: "info",
          });
        }
      } else if (modalType === "video") {
        const updated = {
          ...settings,
          [modalTargetPage]: {
            ...settings[modalTargetPage],
            bannerType: "lottie" as const,
            videoUrl,
          },
        };
        setModalOpen(false);
        await handleSave(updated as unknown as PageSettings);
        setToast({
          open: true,
          message: "Video conversion to Lottie is in progress. Existing banner remains live.",
          severity: "info",
        });
      } else {
        const updated: PageSettings = {
          ...settings,
          [modalTargetPage]: {
            ...settings[modalTargetPage],
            bannerType: "image",
            bannerImage: modalMediaPayload,
          },
        };
        setModalOpen(false);
        await handleSave(updated);
      }
    } catch (err) {
      console.error("Error submitting banner media:", err);
      setToast({
        open: true,
        message: err instanceof Error ? err.message : "Failed to upload video",
        severity: "error",
      });
    } finally {
      setModalUploading(false);
    }
  };

  // Remove a slide from home slideshow
  const handleRemoveSlide = (slideId: string) => {
    if (settings.home.banners.length <= 1) {
      setToast({ open: true, message: "At least one slide is required", severity: "error" });
      return;
    }
    const updated: PageSettings = {
      ...settings,
      home: {
        ...settings.home,
        banners: settings.home.banners.filter((b) => b.id !== slideId),
      },
    };
    setSettings(updated);
    setSlideImageUploads((prev) => {
      const next = { ...prev };
      delete next[slideId];
      return next;
    });
  };

  // Replace an image on an existing slide
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
      const result = reader.result as string;
      setSlideImageUploads((prev) => ({ ...prev, [slideId]: result }));
    };
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 350 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Page & Banner Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage multi-slide Image Carousels or Single Video-to-Lottie animated banners for your storefront.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          onClick={() => handleSave()}
          disabled={saving}
          sx={{
            borderRadius: 2,
            px: 3.5,
            py: 1.2,
            fontWeight: 700,
            backgroundColor: "#0284c7",
            "&:hover": { backgroundColor: "#0369a1" },
          }}
        >
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </Box>

      {/* Video Conversion Processing Banner */}
      {isVideoProcessing && (
        <Alert
          severity="warning"
          icon={<HourglassTopIcon className="animate-spin" />}
          sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}
        >
          Video conversion to Lottie JSON is in progress. Your current live banner remains visible to customers until conversion finishes.
        </Alert>
      )}

      {/* Navigation Tabs */}
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

      {/* TAB 0: HOME PAGE BANNER */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Banner Mode Selector Card */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                    Home Banner Format
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Choose between a Multi-Slide Image Carousel (Add Slides) or a Single Video / Lottie Animation.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<AddPhotoAlternateIcon />}
                  onClick={() => handleOpenModal("home")}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    backgroundColor: "#f59e0b",
                    color: "#1a1a1a",
                    "&:hover": { backgroundColor: "#d97706" },
                  }}
                >
                  + Add New Banner / Slide
                </Button>
              </Box>

              <RadioGroup
                row
                value={settings.home.bannerMode || "image_slider"}
                onChange={(e) => {
                  const mode = e.target.value as "image_slider" | "single_lottie";
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
                      <Typography sx={{ fontWeight: 600 }}>Image Carousel Slideshow (Multiple Slides)</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="single_lottie"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <AnimationIcon sx={{ fontSize: 20, color: "#8b5cf6" }} />
                      <Typography sx={{ fontWeight: 600 }}>Single Video / Lottie Banner (1 Banner Only)</Typography>
                    </Box>
                  }
                />
              </RadioGroup>

              {/* MODE A: MULTI-IMAGE SLIDER */}
              {settings.home.bannerMode !== "single_lottie" && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#475569", mb: 2 }}>
                    Active Slides ({settings.home.banners.length} images in carousel)
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
                                  media={{ type: slide.activeMedia?.type || "image", url: previewUrl }}
                                  alt={slide.title || "Slide"}
                                  style={{ width: "100%", height: "100%" }}
                                />
                              ) : (
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "text.secondary" }}>
                                  <Typography variant="caption">No image selected</Typography>
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

              {/* MODE B: SINGLE VIDEO / LOTTIE BANNER */}
              {settings.home.bannerMode === "single_lottie" && (
                <Box sx={{ mt: 2, p: 2.5, backgroundColor: "#f8fafc", borderRadius: 3, border: "1px solid #e2e8f0" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Single Video / Lottie Banner
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Renders a single high-performance Lottie JSON vector animation.
                      </Typography>
                    </Box>

                    {settings.home.singleBanner?.processingStatus === "processing" ? (
                      <Chip
                        icon={<HourglassTopIcon fontSize="small" />}
                        label="Converting Video in Queue..."
                        color="warning"
                        sx={{ fontWeight: 700 }}
                      />
                    ) : (
                      <Chip label="LIVE" color="success" size="small" sx={{ fontWeight: 700 }} />
                    )}
                  </Box>

                  {/* Live Banner Preview */}
                  <Box sx={{ height: 260, borderRadius: 2.5, overflow: "hidden", backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}>
                    <BannerMediaRenderer
                      media={settings.home.singleBanner?.activeMedia}
                      alt={settings.home.singleBanner?.title || "Home Single Banner"}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </Box>

                  <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<MovieCreationIcon />}
                      onClick={() => handleOpenModal("home")}
                      disabled={isVideoProcessing}
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      {isVideoProcessing ? "Conversion in Progress..." : "Upload New Video (Auto-Convert to Lottie)"}
                    </Button>
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Quotas */}
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

      {/* TAB 1: SHOP PAGE */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              Shop Catalog Page Banner
            </Typography>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => handleOpenModal("shop")}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Configure Banner (Image / Video)
            </Button>
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
                Live Background Preview ({settings.shop.bannerType?.toUpperCase() || "IMAGE"})
              </Typography>
              <Box sx={{ height: 160, borderRadius: 2, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                <BannerMediaRenderer
                  media={{ type: settings.shop.bannerType || "image", url: settings.shop.bannerImage || "" }}
                  alt="Shop Banner"
                  style={{ width: "100%", height: "100%" }}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* TAB 2: ABOUT PAGE */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              About Us Page Banner
            </Typography>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => handleOpenModal("about")}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Configure Banner (Image / Video)
            </Button>
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
                Live Background Preview
              </Typography>
              <Box sx={{ height: 160, borderRadius: 2, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                <BannerMediaRenderer
                  media={{ type: settings.about.bannerType || "image", url: settings.about.bannerImage || "" }}
                  alt="About Banner"
                  style={{ width: "100%", height: "100%" }}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* TAB 3: CONTACT PAGE */}
      {activeTab === 3 && (
        <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              Contact Page Banner
            </Typography>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => handleOpenModal("contact")}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Configure Banner (Image / Video)
            </Button>
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
                Live Background Preview
              </Typography>
              <Box sx={{ height: 160, borderRadius: 2, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                <BannerMediaRenderer
                  media={{ type: settings.contact.bannerType || "image", url: settings.contact.bannerImage || "" }}
                  alt="Contact Banner"
                  style={{ width: "100%", height: "100%" }}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* MODAL: ADD NEW BANNER / UPLOAD VIDEO OR IMAGE */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Add New Banner ({modalTargetPage.toUpperCase()})
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#475569" }}>
              1. SELECT MEDIA TYPE
            </Typography>
            <RadioGroup
              row
              value={modalType}
              onChange={(e) => {
                if (modalMediaPreview.startsWith("blob:")) {
                  URL.revokeObjectURL(modalMediaPreview);
                }
                setModalType(e.target.value as "image" | "video");
                setModalMediaPayload("");
                setModalMediaPreview("");
                setModalVideoFile(null);
              }}
            >
              <FormControlLabel
                value="image"
                control={<Radio />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CollectionsIcon sx={{ fontSize: 18, color: "#0284c7" }} />
                    <Typography sx={{ fontWeight: 600 }}>Image (Slideshow Slide)</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="video"
                control={<Radio />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <MovieCreationIcon sx={{ fontSize: 18, color: "#8b5cf6" }} />
                    <Typography sx={{ fontWeight: 600 }}>Video (Auto-Convert to Lottie JSON)</Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#475569" }}>
              2. UPLOAD FILE
            </Typography>
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
                sx={{ py: 1.5, textTransform: "none", fontWeight: 700 }}
              >
                {modalVideoFile || modalMediaPayload
                  ? "Change Selected File"
                  : `Browse ${modalType === "video" ? "MOV / MP4 Video" : "Image"}`}
              </Button>
            </label>

            {modalType === "video" && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Video uploads go directly to Cloudinary (avoids size limits), then convert to Lottie in the background.
                Your current live banner stays active until processing finishes.
                {modalVideoFile ? ` Selected: ${modalVideoFile.name}` : ""}
              </Typography>
            )}

            {/* Selected Preview */}
            {modalMediaPreview && modalType === "image" && (
              <Box sx={{ mt: 2, height: 160, borderRadius: 2, overflow: "hidden", position: "relative", border: "1px solid #e2e8f0" }}>
                <Image src={modalMediaPreview} alt="Preview" fill style={{ objectFit: "cover" }} unoptimized />
              </Box>
            )}
            {modalMediaPreview && modalType === "video" && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#10b981" }}>
                  ✓ Video file loaded and ready for conversion queue.
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Banner Title (Optional)"
              size="small"
              fullWidth
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
            />
            <TextField
              label="Banner Subtitle (Optional)"
              size="small"
              fullWidth
              value={modalSubtitle}
              onChange={(e) => setModalSubtitle(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setModalOpen(false)}
            disabled={modalUploading || saving}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleModalSubmit}
            disabled={
              modalUploading ||
              saving ||
              (modalType === "video" ? !modalVideoFile : !modalMediaPayload)
            }
            startIcon={modalUploading ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              backgroundColor: "#0284c7",
              "&:hover": { backgroundColor: "#0369a1" },
            }}
          >
            {modalUploading
              ? "Uploading video…"
              : modalType === "video"
                ? "Start Video Conversion Queue"
                : "Add Image Slide"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%", fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
