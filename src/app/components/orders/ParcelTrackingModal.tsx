"use client";

import React, { useEffect, useState, useCallback } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";

import PostExTrackingTimeline from "./PostExTrackingTimeline";
import { authHeaders } from "@/lib/cart";

interface ParcelTrackingModalProps {
  open: boolean;
  onClose: () => void;
  orderId?: string;
  trackingNumber?: string;
  orderNumber?: string;
}

export default function ParcelTrackingModal({
  open,
  onClose,
  orderId,
  trackingNumber: propTrackingNumber,
  orderNumber,
}: ParcelTrackingModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [trackingData, setTrackingData] = useState<Record<
    string,
    unknown
  > | null>(null);

  const [activeTrackingNumber, setActiveTrackingNumber] = useState<string>(
    propTrackingNumber || "",
  );

  const [activeStatus, setActiveStatus] = useState<string>("Ready to Ship");

  const fetchTracking = useCallback(async () => {
    if (!open || (!orderId && !propTrackingNumber)) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (orderId) params.set("orderId", orderId);
      if (propTrackingNumber) params.set("trackingNumber", propTrackingNumber);

      const res = await fetch(`/api/orders/track?${params.toString()}`, {
        headers: authHeaders(),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load live tracking details");
      }

      setTrackingData(data.data || null);

      const resolvedTn =
        propTrackingNumber ||
        data.data?.dist?.trackingNumber ||
        data.order?.postexDetails?.trackingNumber ||
        data.order?.trackingNumber;

      if (resolvedTn) setActiveTrackingNumber(resolvedTn);

      const resolvedStatus =
        data.data?.dist?.transactionStatus ||
        data.order?.postexStatus ||
        data.order?.postexDetails?.orderStatus ||
        data.order?.status;

      if (resolvedStatus) setActiveStatus(resolvedStatus);
    } catch (err: unknown) {
      const errorObj = err as Error;

      setError(errorObj.message || "Failed to load parcel tracking");
    } finally {
      setLoading(false);
    }
  }, [open, orderId, propTrackingNumber]);

  useEffect(() => {
    if (open) {
      setActiveTrackingNumber(propTrackingNumber || "");
      fetchTracking();
    }
  }, [open, propTrackingNumber, fetchTracking]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              backgroundColor: "#eff6ff",
              color: "#0284c7",
              display: "flex",
            }}
          >
            <LocalShippingOutlinedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}
            >
              Track Shipment
            </Typography>
            {Boolean(orderNumber || orderId) && (
              <Typography variant="caption" color="text.secondary">
                Order #
                {orderNumber ||
                  (orderId ? orderId.slice(-8).toUpperCase() : "")}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: "text.secondary" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {activeTrackingNumber ? (
          <PostExTrackingTimeline
            trackingNumber={activeTrackingNumber}
            currentStatus={activeStatus}
            data={trackingData}
            loading={loading}
            onRefresh={fetchTracking}
          />
        ) : (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography color="text.secondary">
              No PostEx tracking number is associated with this order yet.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 2, fontWeight: 600, textTransform: "none" }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
