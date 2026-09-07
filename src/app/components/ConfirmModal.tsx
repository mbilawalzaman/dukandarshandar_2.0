"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

export interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  loadingLabel?: string;
  cancelLabel?: string;
  confirmColor?: "error" | "primary" | "warning" | "inherit";
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  open,
  title = "Confirm",
  message = "Are you sure?",
  confirmLabel = "Confirm",
  loadingLabel = "Please wait…",
  cancelLabel = "Cancel",
  confirmColor = "error",
  onConfirm,
  onClose,
  loading = false,
}: ConfirmModalProps) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 700, color: confirmColor === "error" ? "#ef4444" : undefined }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} disabled={loading} variant="contained" color={confirmColor}>
          {loading ? loadingLabel : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
