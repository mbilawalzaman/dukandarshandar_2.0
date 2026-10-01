"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Typography,
  Box,
  Alert,
  Chip,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PrintIcon from "@mui/icons-material/Print";

interface PostExBookingModalProps {
  open: boolean;
  onClose: () => void;
  order: {
    _id: string;
    orderNumber?: string;
    customer_name?: string;
    phone?: string;
    city?: string;
    address?: string;
    total_amount?: number;
    postexDetails?: {
      trackingNumber?: string;
      orderStatus?: string;
      shippedAt?: string;
    };
  } | null;
  onSuccess?: () => void;
}

export default function PostExBookingModal({
  open,
  onClose,
  order,
  onSuccess,
}: PostExBookingModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [pickupAddressCode, setPickupAddressCode] = useState<string>("001");
  const [orderType, setOrderType] = useState<string>("Normal");
  const [transactionNotes, setTransactionNotes] = useState<string>("");

  const [trackingInfo, setTrackingInfo] = useState<Record<string, unknown> | null>(null);
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccessMsg(null);
      setTrackingInfo(null);
    }
  }, [open, order]);

  if (!order) return null;

  const trackingNumber = order.postexDetails?.trackingNumber;
  const currentPostExStatus = order.postexDetails?.orderStatus || "Not Booked";

  const handleBookOrder = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/postex/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order._id,
          pickupAddressCode,
          orderType,
          transactionNotes,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: { trackingNumber?: string };
      };

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to book order with PostEx");
      }

      setSuccessMsg(`Successfully booked! PostEx Tracking Number: ${data.data?.trackingNumber || ""}`);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "An error occurred during booking");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAirwayBill = async () => {
    if (!trackingNumber) return;
    try {
      const res = await fetch("/api/admin/postex/airway-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumbers: [trackingNumber] }),
      });

      if (!res.ok) throw new Error("Failed to fetch Airway Bill PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to print label");
    }
  };

  const handleTrackPackage = async () => {
    if (!trackingNumber) return;
    setTrackingLoading(true);
    try {
      const res = await fetch(`/api/admin/postex/track?trackingNumber=${encodeURIComponent(trackingNumber)}`);
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: Record<string, unknown>;
      };
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to track order");
      setTrackingInfo(data.data || null);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to track shipment");
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LocalShippingIcon color="primary" />
        PostEx Courier Booking (Order #{order.orderNumber || order._id})
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {successMsg && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMsg}
          </Alert>
        )}

        {trackingNumber ? (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Booked Tracking Number:
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, my: 1 }}>
              <Typography variant="h6" sx={{ fontFamily: "monospace", fontWeight: "bold" }}>
                {trackingNumber}
              </Typography>
              <Chip label={currentPostExStatus} color="info" size="small" />
            </Box>

            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<PrintIcon />}
                onClick={handlePrintAirwayBill}
              >
                Print Airway Bill PDF
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleTrackPackage}
                disabled={trackingLoading}
              >
                {trackingLoading ? <CircularProgress size={20} /> : "Track Package"}
              </Button>
            </Box>

            {trackingInfo && (
              <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Typography variant="subtitle2">PostEx Status Details:</Typography>
                <pre style={{ fontSize: "12px", overflowX: "auto" }}>
                  {JSON.stringify(trackingInfo, null, 2)}
                </pre>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Customer: <strong>{order.customer_name || "N/A"}</strong> ({order.city || "No City"})
              <br />
              COD Amount: <strong>PKR {order.total_amount || 0}</strong>
            </Typography>

            <TextField
              select
              label="Order Type"
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              fullWidth
            >
              <MenuItem value="Normal">Normal (Standard Shipment)</MenuItem>
              <MenuItem value="Reversed">Reversed (Return Pickup)</MenuItem>
              <MenuItem value="Replacement">Replacement (Swap Parcel)</MenuItem>
            </TextField>

            <TextField
              label="Pickup Address Code"
              value={pickupAddressCode}
              onChange={(e) => setPickupAddressCode(e.target.value)}
              fullWidth
              helperText="Default: 001 (Lahore Warehouse)"
            />

            <TextField
              label="Transaction Notes / Special Instructions"
              value={transactionNotes}
              onChange={(e) => setTransactionNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
              placeholder="e.g. Handle with care, Call customer before delivery"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        {!trackingNumber && (
          <Button
            onClick={handleBookOrder}
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <LocalShippingIcon />}
          >
            {loading ? "Booking..." : "Book with PostEx"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
