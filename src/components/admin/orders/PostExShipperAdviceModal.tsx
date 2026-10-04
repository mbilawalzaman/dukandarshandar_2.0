"use client";

import React, { useEffect, useState } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Chip,
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import ReplayIcon from "@mui/icons-material/Replay";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

import { BRAND } from "@/lib/uiBrand";

interface PostExShipperAdviceModalProps {
  open: boolean;
  onClose: () => void;
  order: {
    _id: string;
    customer_name?: string;
    phone?: string;
    postexDetails?: {
      trackingNumber?: string;
      orderStatus?: string;
    };
  } | null;
  onSuccess?: () => void;
}

interface ShipperAdviceHistoryItem {
  statusId?: number;
  statusName?: string;
  remarks?: string;
  createdAt?: string;
}

export default function PostExShipperAdviceModal({
  open,
  onClose,
  order,
  onSuccess,
}: PostExShipperAdviceModalProps) {
  const trackingNumber = order?.postexDetails?.trackingNumber || "";

  const [statusId, setStatusId] = useState<number>(2); // Default to 2: Re-attempt delivery
  const [remarks, setRemarks] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [history, setHistory] = useState<ShipperAdviceHistoryItem[]>([]);

  useEffect(() => {
    if (open && trackingNumber) {
      setError("");
      setSuccessMsg("");
      setRemarks("");
      setStatusId(2);

      // Fetch existing shipper advice history
      void (async () => {
        setHistoryLoading(true);

        try {
          const token = localStorage.getItem("token");

          const res = await fetch(
            `/api/admin/postex/shipper-advice?trackingNumber=${encodeURIComponent(
              trackingNumber,
            )}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          );

          const data = await res.json();

          if (res.ok && data.success && data.data) {
            const adviceList = Array.isArray(data.data.dist)
              ? data.data.dist
              : Array.isArray(data.data)
                ? data.data
                : [];

            setHistory(adviceList);
          } else {
            setHistory([]);
          }
        } catch {
          setHistory([]);
        } finally {
          setHistoryLoading(false);
        }
      })();
    }
  }, [open, trackingNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trackingNumber) {
      setError("No tracking number available for this order");

      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/admin/postex/shipper-advice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          trackingNumber,
          statusId,
          remarks: remarks.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Failed to submit Shipper Advice to PostEx",
        );
      }

      setSuccessMsg(
        statusId === 2
          ? "Re-attempt delivery advice submitted successfully to PostEx!"
          : "Return to origin request submitted successfully to PostEx!",
      );

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const errorObj = err as Error;

      setError(errorObj.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          fontWeight: 800,
          color: BRAND.navy,
          pb: 1,
        }}
      >
        <SupportAgentIcon sx={{ color: BRAND.gold, fontSize: 32 }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND.navy }}>
            PostEx Shipper Advice
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Provide instructions to PostEx for failed delivery attempts or
            returns
          </Typography>
        </Box>
      </DialogTitle>

      <Divider />

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2.5 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {successMsg && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              {successMsg}
            </Alert>
          )}

          {/* Shipment Overview Box */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              backgroundColor: "var(--theme-bg-default, #f8fafc)",
              borderColor: "#e2e8f0",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Tracking Number:
              </Typography>
              <Chip
                icon={<LocalShippingIcon fontSize="small" />}
                label={trackingNumber || "N/A"}
                size="small"
                sx={{
                  fontWeight: 700,
                  backgroundColor: "#042549",
                  color: "#ffffff",
                  "& .MuiChip-icon": { color: BRAND.gold },
                }}
              />
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Customer Name:
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, color: BRAND.navy }}
              >
                {order?.customer_name || "N/A"}
              </Typography>
            </Box>
          </Paper>

          {/* Action Selection */}
          <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
            <FormLabel
              component="legend"
              sx={{
                fontWeight: 700,
                color: BRAND.navy,
                mb: 1,
                fontSize: "0.95rem",
              }}
            >
              Select Delivery Instruction Action *
            </FormLabel>
            <RadioGroup
              value={statusId}
              onChange={(e) => setStatusId(Number(e.target.value))}
            >
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 1.5,
                  borderRadius: 2,
                  borderColor: statusId === 2 ? BRAND.gold : "#e2e8f0",
                  backgroundColor: statusId === 2 ? "#fffbeb" : "#ffffff",
                  cursor: "pointer",
                }}
                onClick={() => setStatusId(2)}
              >
                <FormControlLabel
                  value={2}
                  control={<Radio size="small" sx={{ color: BRAND.gold }} />}
                  label={
                    <Box sx={{ ml: 0.5 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <ReplayIcon
                          fontSize="small"
                          sx={{ color: "#0284c7" }}
                        />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: BRAND.navy }}
                        >
                          Re-attempt Delivery (Retry)
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Instruct PostEx rider to attempt delivery again at
                        customer address
                      </Typography>
                    </Box>
                  }
                />
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  borderColor: statusId === 1 ? "#dc2626" : "#e2e8f0",
                  backgroundColor: statusId === 1 ? "#fef2f2" : "#ffffff",
                  cursor: "pointer",
                }}
                onClick={() => setStatusId(1)}
              >
                <FormControlLabel
                  value={1}
                  control={<Radio size="small" sx={{ color: "#dc2626" }} />}
                  label={
                    <Box sx={{ ml: 0.5 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <KeyboardReturnIcon
                          fontSize="small"
                          sx={{ color: "#dc2626" }}
                        />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: "#dc2626" }}
                        >
                          Return to Origin (RTO)
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Cancel shipment delivery and request PostEx to return
                        parcel to warehouse
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            </RadioGroup>
          </FormControl>

          {/* Remarks input */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Remarks / Instructions for Courier"
            placeholder="e.g. Customer requested re-attempt tomorrow between 2 PM - 5 PM"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            helperText="Add any specific delivery timing or customer comments"
            sx={{ mb: 2 }}
          />

          {/* Advice History Section */}
          {historyLoading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                Checking existing advice history...
              </Typography>
            </Box>
          ) : history.length > 0 ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Previous Advice History:
              </Typography>
              {history.map((item, idx) => (
                <Paper
                  key={idx}
                  variant="outlined"
                  sx={{ p: 1.5, mb: 1, borderRadius: 2, fontSize: "0.85rem" }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {item.statusName ||
                      (item.statusId === 1
                        ? "Return Requested"
                        : "Re-attempt Retry")}
                  </Typography>
                  {item.remarks && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {item.remarks}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Box>
          ) : null}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={onClose}
            disabled={loading}
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !trackingNumber}
            startIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SupportAgentIcon />
              )
            }
            sx={{
              textTransform: "none",
              fontWeight: 700,
              backgroundColor: statusId === 1 ? "#dc2626" : BRAND.gold,
              color: statusId === 1 ? "#ffffff" : BRAND.navy,
              "&:hover": {
                backgroundColor: statusId === 1 ? "#b91c1c" : BRAND.goldHover,
              },
            }}
          >
            {loading
              ? "Submitting..."
              : statusId === 1
                ? "Submit Return Request"
                : "Submit Re-attempt Advice"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
