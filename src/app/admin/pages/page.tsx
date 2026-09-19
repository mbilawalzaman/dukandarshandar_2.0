"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import GavelIcon from "@mui/icons-material/Gavel";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import ViewCarouselIcon from "@mui/icons-material/ViewCarousel";
import StorefrontIcon from "@mui/icons-material/Storefront";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ContactMailIcon from "@mui/icons-material/ContactMail";

import type { BannerItem, MediaAsset, PageSettings, PageSettingsKey } from "@/lib/pageSettings";
import { DEFAULT_PAGE_SETTINGS } from "@/lib/pageSettings";
import { uploadVideoToCloudinary } from "@/lib/cloudinaryClientUpload";
import HomeTab from "@/app/components/admin/pages/HomeTab";
import ShopCatalogTab from "@/app/components/admin/pages/ShopCatalogTab";
import AboutUsTab from "@/app/components/admin/pages/AboutUsTab";
import ContactTab from "@/app/components/admin/pages/ContactTab";
import PolicyTab from "@/app/components/admin/pages/PolicyTab";
import ConfigureBannerModal from "@/app/components/admin/pages/ConfigureBannerModal";

const PAGE_LABELS: Record<PageSettingsKey, string> = {
  home: "Home",
  shop: "Shop",
  about: "About",
  contact: "Contact",
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
  shipping: "Shipping Policy",
  returns: "Returns & Refunds",
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
  const [modalGoToLink, setModalGoToLink] = useState("");
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

  const savePage = async (page: PageSettingsKey, overrideSettings?: PageSettings): Promise<boolean> => {
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
    setModalGoToLink("");
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
    try {
      setModalUploading(true);
      let videoAsset: MediaAsset | null = null;
      if (modalType === "video" && modalVideoFile) {
        setToast({ open: true, message: "Uploading video directly to Cloudinary...", severity: "info" });
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

      if (modalTargetPage === "home") {
        if (modalType === "image") {
          const newSlide: BannerItem = {
            id: `banner-${Date.now()}`,
            title: modalTitle.trim() || `Slide #${settings.home.banners.length + 1}`,
            subtitle: modalSubtitle.trim(),
            goToLink: modalGoToLink.trim() || undefined,
            order: settings.home.banners.length + 1,
            isActive: true,
            activeMedia: {
              type: "image",
              url: modalMediaPayload,
              resourceType: "image",
            },
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
                title: modalTitle.trim() || settings.home.singleBanner?.title || "",
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
        <Typography variant="body2" color="text.secondary">
          Edit each page separately. Image carousels or MP4 video banners upload directly to Cloudinary.
        </Typography>
      </Box>

      <Paper sx={{ mb: 3, borderRadius: 3 }} elevation={0}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": { textTransform: "none", fontWeight: 700, minHeight: 52 },
          }}
        >
          <Tab icon={<ViewCarouselIcon />} iconPosition="start" label="Home Page Banner" />
          <Tab icon={<StorefrontIcon />} iconPosition="start" label="Shop Catalog Page" />
          <Tab icon={<InfoOutlinedIcon />} iconPosition="start" label="About Us Page" />
          <Tab icon={<ContactMailIcon />} iconPosition="start" label="Contact Page" />
          <Tab icon={<SecurityIcon />} iconPosition="start" label="Privacy Policy" />
          <Tab icon={<GavelIcon />} iconPosition="start" label="Terms & Conditions" />
          <Tab icon={<LocalShippingIcon />} iconPosition="start" label="Shipping Policy" />
          <Tab icon={<AssignmentReturnIcon />} iconPosition="start" label="Returns & Refunds" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <HomeTab
          settings={settings}
          setSettings={setSettings}
          savingPage={savingPage}
          modalUploading={modalUploading}
          slideImageUploads={slideImageUploads}
          onOpenModal={handleOpenModal}
          onRemoveSlide={handleRemoveSlide}
          onReplaceSlideImage={handleReplaceSlideImage}
          onSavePage={savePage}
        />
      )}

      {activeTab === 1 && (
        <ShopCatalogTab
          settings={settings}
          setSettings={setSettings}
          savingPage={savingPage}
          modalUploading={modalUploading}
          onOpenModal={handleOpenModal}
          onSavePage={savePage}
        />
      )}

      {activeTab === 2 && (
        <AboutUsTab
          settings={settings}
          setSettings={setSettings}
          savingPage={savingPage}
          modalUploading={modalUploading}
          onOpenModal={handleOpenModal}
          onSavePage={savePage}
        />
      )}

      {activeTab === 3 && (
        <ContactTab
          settings={settings}
          setSettings={setSettings}
          savingPage={savingPage}
          modalUploading={modalUploading}
          onOpenModal={handleOpenModal}
          onSavePage={savePage}
        />
      )}

      {activeTab === 4 && (
        <PolicyTab
          pageKey="privacy"
          pageTitle="Privacy Policy"
          settings={settings}
          setSettings={setSettings}
          savingPage={savingPage}
          modalUploading={modalUploading}
          onOpenModal={handleOpenModal}
          onSavePage={savePage}
        />
      )}

      {activeTab === 5 && (
        <PolicyTab
          pageKey="terms"
          pageTitle="Terms & Conditions"
          settings={settings}
          setSettings={setSettings}
          savingPage={savingPage}
          modalUploading={modalUploading}
          onOpenModal={handleOpenModal}
          onSavePage={savePage}
        />
      )}

      {activeTab === 6 && (
        <PolicyTab
          pageKey="shipping"
          pageTitle="Shipping Policy"
          settings={settings}
          setSettings={setSettings}
          savingPage={savingPage}
          modalUploading={modalUploading}
          onOpenModal={handleOpenModal}
          onSavePage={savePage}
        />
      )}

      {activeTab === 7 && (
        <PolicyTab
          pageKey="returns"
          pageTitle="Returns & Refunds"
          settings={settings}
          setSettings={setSettings}
          savingPage={savingPage}
          modalUploading={modalUploading}
          onOpenModal={handleOpenModal}
          onSavePage={savePage}
        />
      )}

      <ConfigureBannerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        modalType={modalType}
        setModalType={setModalType}
        modalTargetPage={modalTargetPage}
        modalMediaPayload={modalMediaPayload}
        modalMediaPreview={modalMediaPreview}
        modalVideoFile={modalVideoFile}
        modalUploading={modalUploading}
        savingPage={savingPage}
        modalTitle={modalTitle}
        setModalTitle={setModalTitle}
        modalSubtitle={modalSubtitle}
        setModalSubtitle={setModalSubtitle}
        modalGoToLink={modalGoToLink}
        setModalGoToLink={setModalGoToLink}
        clearModalMedia={clearModalMedia}
        onFileSelect={handleModalFileSelect}
        onSubmit={handleModalSubmit}
      />

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
