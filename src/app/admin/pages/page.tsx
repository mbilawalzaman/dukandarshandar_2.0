"use client";

import React, { useEffect, useState, useRef } from "react";
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
  IconButton,
  Alert,
  CircularProgress,
  Snackbar,
  Card,
  CardMedia,
  CardActions,
  InputAdornment,
} from "@mui/material";
import ViewCarouselIcon from "@mui/icons-material/ViewCarousel";
import StorefrontIcon from "@mui/icons-material/Storefront";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ContactMailIcon from "@mui/icons-material/ContactMail";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveIcon from "@mui/icons-material/Save";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import { DEFAULT_PAGE_SETTINGS, PageSettings } from "@/lib/pageSettings";

export default function AdminManagePages() {
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const [newImageUrl, setNewImageUrl] = useState("");
  const homeBannerInputRef = useRef<HTMLInputElement>(null);
  const shopBannerInputRef = useRef<HTMLInputElement>(null);
  const aboutBannerInputRef = useRef<HTMLInputElement>(null);
  const contactBannerInputRef = useRef<HTMLInputElement>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch("/api/admin/page-settings", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error("Error fetching page settings:", err);
      setToast({ open: true, message: "Failed to load page settings", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch("/api/admin/page-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setToast({ open: true, message: "Page settings saved successfully!", severity: "success" });
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

  // Helper for single banner image uploads
  const handleSingleImageFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    pageKey: "shop" | "about" | "contact"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({ open: true, message: "Image must be under 5MB", severity: "error" });
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      setSettings((prev) => ({
        ...prev,
        [pageKey]: {
          ...prev[pageKey],
          bannerImage: result,
        },
      }));
    };
  };

  // Helper for adding home banner image via file picker
  const handleAddHomeBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({ open: true, message: "Image must be under 5MB", severity: "error" });
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      setSettings((prev) => ({
        ...prev,
        home: {
          ...prev.home,
          bannerImages: [...prev.home.bannerImages, result],
        },
      }));
    };
  };

  // Helper for adding home banner image via URL
  const handleAddHomeBannerUrl = () => {
    if (!newImageUrl.trim()) return;
    setSettings((prev) => ({
      ...prev,
      home: {
        ...prev.home,
        bannerImages: [...prev.home.bannerImages, newImageUrl.trim()],
      },
    }));
    setNewImageUrl("");
  };

  // Helper for removing a home banner slide
  const handleRemoveHomeBanner = (indexToRemove: number) => {
    if (settings.home.bannerImages.length <= 1) {
      setToast({ open: true, message: "At least one banner image is required for the Home slider", severity: "error" });
      return;
    }
    setSettings((prev) => ({
      ...prev,
      home: {
        ...prev.home,
        bannerImages: prev.home.bannerImages.filter((_, idx) => idx !== indexToRemove),
      },
    }));
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
      {/* Header with Save Button */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Page & Banner Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure banners, slider images, and product display quotas for each storefront page.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
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
          {saving ? "Saving Changes..." : "Save All Changes"}
        </Button>
      </Box>

      {/* Navigation Tabs for Pages */}
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
          <Tab icon={<ViewCarouselIcon />} iconPosition="start" label="Home Page" />
          <Tab icon={<StorefrontIcon />} iconPosition="start" label="Shop Catalog Page" />
          <Tab icon={<InfoOutlinedIcon />} iconPosition="start" label="About Us Page" />
          <Tab icon={<ContactMailIcon />} iconPosition="start" label="Contact Page" />
        </Tabs>
      </Paper>

      {/* TAB 0: HOME PAGE CONFIG */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Banner Slider Configuration */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Home Hero Banner Slides
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active slides currently displayed on the interactive homepage carousel.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddPhotoAlternateIcon />}
                  onClick={() => homeBannerInputRef.current?.click()}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Upload Slide
                </Button>
                <input
                  ref={homeBannerInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAddHomeBannerFile}
                />
              </Box>

              {/* Add by URL input */}
              <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Or paste an image URL (e.g. /images/banner1.jpg or https://...)"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddHomeBannerUrl();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAddHomeBannerUrl}
                  disabled={!newImageUrl.trim()}
                  sx={{ whiteSpace: "nowrap", textTransform: "none" }}
                >
                  Add URL
                </Button>
              </Box>

              {/* Slider Images Preview Cards */}
              <Grid container spacing={2}>
                {settings.home.bannerImages.map((src, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card
                      sx={{
                        borderRadius: 2,
                        border: "1px solid #e2e8f0",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <CardMedia
                        component="img"
                        height="130"
                        image={src}
                        alt={`Slide ${index + 1}`}
                        sx={{ objectFit: "cover", backgroundColor: "#f1f5f9" }}
                      />
                      <CardActions sx={{ justifyContent: "space-between", p: 1, backgroundColor: "#f8fafc" }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b" }}>
                          Slide #{index + 1}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveHomeBanner(index)}
                          title="Remove slide"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* Home Product Quantities Quota */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Home Product Display Quotas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Control how many products are rendered on the homepage sections.
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Top Searches / Top Rated Products Count"
                  helperText="Number of highest-rated items displayed in the Top Searches carousel section (Default: 4)"
                  value={settings.home.topRatedCount}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      home: { ...prev.home, topRatedCount: Number(e.target.value) },
                    }))
                  }
                  InputProps={{
                    inputProps: { min: 1, max: 24 },
                    endAdornment: <InputAdornment position="end">items</InputAdornment>,
                  }}
                />

                <TextField
                  fullWidth
                  type="number"
                  label="Home Catalog Products Per Page"
                  helperText="Number of products shown per page in the main Home catalog grid (Default: 9)"
                  value={settings.home.productsPerPage}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      home: { ...prev.home, productsPerPage: Number(e.target.value) },
                    }))
                  }
                  InputProps={{
                    inputProps: { min: 1, max: 48 },
                    endAdornment: <InputAdornment position="end">products</InputAdornment>,
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: SHOP PAGE CONFIG */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Shop Header Banner
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Customize the banner heading, subheading, and background on the /shop page.
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <TextField
                  fullWidth
                  label="Shop Banner Title"
                  value={settings.shop.bannerTitle}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      shop: { ...prev.shop, bannerTitle: e.target.value },
                    }))
                  }
                />

                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Shop Banner Subtitle"
                  value={settings.shop.bannerSubtitle}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      shop: { ...prev.shop, bannerSubtitle: e.target.value },
                    }))
                  }
                />

                <Divider sx={{ my: 1 }} />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Optional Custom Banner Background Image
                  </Typography>
                  {settings.shop.bannerImage ? (
                    <Box sx={{ position: "relative", borderRadius: 2, overflow: "hidden", mb: 1, maxHeight: 160 }}>
                      <Box
                        component="img"
                        src={settings.shop.bannerImage}
                        alt="Shop banner preview"
                        sx={{ width: "100%", height: 140, objectFit: "cover" }}
                      />
                      <Button
                        size="small"
                        color="error"
                        variant="contained"
                        onClick={() =>
                          setSettings((prev) => ({ ...prev, shop: { ...prev.shop, bannerImage: "" } }))
                        }
                        sx={{ position: "absolute", top: 8, right: 8 }}
                      >
                        Remove Image
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<CloudUploadIcon />}
                      onClick={() => shopBannerInputRef.current?.click()}
                      sx={{ textTransform: "none" }}
                    >
                      Upload Banner Background
                    </Button>
                  )}
                  <input
                    ref={shopBannerInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleSingleImageFile(e, "shop")}
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Shop Products Pagination
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Set the number of products displayed per page when customers view the full Shop catalog.
              </Typography>

              <TextField
                fullWidth
                type="number"
                label="Products Per Page (Shop Catalog)"
                value={settings.shop.productsPerPage}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    shop: { ...prev.shop, productsPerPage: Number(e.target.value) },
                  }))
                }
                InputProps={{
                  inputProps: { min: 1, max: 48 },
                  endAdornment: <InputAdornment position="end">products</InputAdornment>,
                }}
              />
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* TAB 2: ABOUT US PAGE CONFIG */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                About Us Page Banner
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Customize the banner and title displayed on the /about story page.
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <TextField
                  fullWidth
                  label="About Page Title"
                  value={settings.about.bannerTitle}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      about: { ...prev.about, bannerTitle: e.target.value },
                    }))
                  }
                />

                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="About Page Subtitle"
                  value={settings.about.bannerSubtitle}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      about: { ...prev.about, bannerSubtitle: e.target.value },
                    }))
                  }
                />

                <Divider sx={{ my: 1 }} />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Optional Custom Banner Background Image
                  </Typography>
                  {settings.about.bannerImage ? (
                    <Box sx={{ position: "relative", borderRadius: 2, overflow: "hidden", mb: 1, maxHeight: 160 }}>
                      <Box
                        component="img"
                        src={settings.about.bannerImage}
                        alt="About banner preview"
                        sx={{ width: "100%", height: 140, objectFit: "cover" }}
                      />
                      <Button
                        size="small"
                        color="error"
                        variant="contained"
                        onClick={() =>
                          setSettings((prev) => ({ ...prev, about: { ...prev.about, bannerImage: "" } }))
                        }
                        sx={{ position: "absolute", top: 8, right: 8 }}
                      >
                        Remove Image
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<CloudUploadIcon />}
                      onClick={() => aboutBannerInputRef.current?.click()}
                      sx={{ textTransform: "none" }}
                    >
                      Upload Banner Background
                    </Button>
                  )}
                  <input
                    ref={aboutBannerInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleSingleImageFile(e, "about")}
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* TAB 3: CONTACT PAGE CONFIG */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Contact Us Page Banner
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Customize the banner title and subtitle displayed on the /contact inquiry page.
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <TextField
                  fullWidth
                  label="Contact Page Title"
                  value={settings.contact.bannerTitle}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      contact: { ...prev.contact, bannerTitle: e.target.value },
                    }))
                  }
                />

                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Contact Page Subtitle"
                  value={settings.contact.bannerSubtitle}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      contact: { ...prev.contact, bannerSubtitle: e.target.value },
                    }))
                  }
                />

                <Divider sx={{ my: 1 }} />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Optional Custom Banner Background Image
                  </Typography>
                  {settings.contact.bannerImage ? (
                    <Box sx={{ position: "relative", borderRadius: 2, overflow: "hidden", mb: 1, maxHeight: 160 }}>
                      <Box
                        component="img"
                        src={settings.contact.bannerImage}
                        alt="Contact banner preview"
                        sx={{ width: "100%", height: 140, objectFit: "cover" }}
                      />
                      <Button
                        size="small"
                        color="error"
                        variant="contained"
                        onClick={() =>
                          setSettings((prev) => ({ ...prev, contact: { ...prev.contact, bannerImage: "" } }))
                        }
                        sx={{ position: "absolute", top: 8, right: 8 }}
                      >
                        Remove Image
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<CloudUploadIcon />}
                      onClick={() => contactBannerInputRef.current?.click()}
                      sx={{ textTransform: "none" }}
                    >
                      Upload Banner Background
                    </Button>
                  )}
                  <input
                    ref={contactBannerInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleSingleImageFile(e, "contact")}
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Feedback Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: "100%", fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
