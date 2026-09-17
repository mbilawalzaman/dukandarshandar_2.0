"use client";

import React from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  CircularProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CollectionsIcon from "@mui/icons-material/Collections";
import MovieCreationIcon from "@mui/icons-material/MovieCreation";
import type { PageSettingsKey } from "@/lib/pageSettings";

const PAGE_LABELS: Record<PageSettingsKey, string> = {
  home: "Home",
  shop: "Shop",
  about: "About",
  contact: "Contact",
};

export interface ConfigureBannerModalProps {
  open: boolean;
  onClose: () => void;
  modalType: "image" | "video";
  setModalType: (type: "image" | "video") => void;
  modalTargetPage: PageSettingsKey;
  modalMediaPayload: string;
  modalMediaPreview: string;
  modalVideoFile: File | null;
  modalUploading: boolean;
  savingPage: PageSettingsKey | null;
  modalTitle: string;
  setModalTitle: (title: string) => void;
  modalSubtitle: string;
  setModalSubtitle: (subtitle: string) => void;
  modalGoToLink: string;
  setModalGoToLink: (link: string) => void;
  clearModalMedia: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => Promise<void>;
}

export default function ConfigureBannerModal({
  open,
  onClose,
  modalType,
  setModalType,
  modalTargetPage,
  modalMediaPayload,
  modalMediaPreview,
  modalVideoFile,
  modalUploading,
  savingPage,
  modalTitle,
  setModalTitle,
  modalSubtitle,
  setModalSubtitle,
  modalGoToLink,
  setModalGoToLink,
  clearModalMedia,
  onFileSelect,
  onSubmit,
}: ConfigureBannerModalProps) {
  return (
    <Dialog open={open} onClose={() => !modalUploading && onClose()} maxWidth="sm" fullWidth>
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
            onChange={onFileSelect}
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
          <TextField label="GoTo Link / URL (Optional)" size="small" fullWidth placeholder="e.g. /shop or https://..." value={modalGoToLink} onChange={(e) => setModalGoToLink(e.target.value)} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={modalUploading} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
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
  );
}
