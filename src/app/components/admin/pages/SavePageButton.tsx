"use client";

import React from "react";
import { Button, CircularProgress } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import type { PageSettingsKey } from "@/lib/pageSettings";

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

export interface SavePageButtonProps {
  page: PageSettingsKey;
  savingPage: PageSettingsKey | null;
  modalUploading: boolean;
  onSave: (page: PageSettingsKey) => Promise<boolean>;
}

export default function SavePageButton({
  page,
  savingPage,
  modalUploading,
  onSave,
}: SavePageButtonProps) {
  const isSaving = savingPage === page;

  return (
    <Button
      variant="contained"
      startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
      onClick={() => onSave(page)}
      disabled={savingPage !== null || modalUploading}
      sx={{
        borderRadius: 2,
        px: 3,
        py: 1.1,
        fontWeight: 700,
        textTransform: "none",
        backgroundColor: "var(--theme-primary-main, #0284c7)",
        "&:hover": { backgroundColor: "var(--theme-primary-dark, #0369a1)" },
      }}
    >
      {isSaving ? "Saving..." : `Save ${PAGE_LABELS[page]}`}
    </Button>
  );
}
