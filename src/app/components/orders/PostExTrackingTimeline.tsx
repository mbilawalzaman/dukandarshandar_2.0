"use client";

import React, { useState } from "react";

import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Grid,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import InventoryIcon from "@mui/icons-material/Inventory";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";

export interface StatusHistoryItem {
  statusCode?: string;
  statusMessage?: string;
  transactionStatusMessage?: string;
  orderStatus?: string;
  createdAt?: string;
  timestamp?: string;
  date?: string;
}

export interface PostExDistData {
  trackingNumber?: string;
  transactionStatus?: string;
  orderStatus?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  cityName?: string;
  invoicePayment?: number | string;
  pickupAddress?: string;
  transactionStatusHistory?: StatusHistoryItem[];
  statusHistory?: StatusHistoryItem[];
}

interface PostExTrackingTimelineProps {
  trackingNumber: string;
  currentStatus?: string;
  data?: Record<string, unknown> | null;
  loading?: boolean;
  onRefresh?: () => void;
  showOrderMeta?: boolean;
}

function resolvePostExStage(status?: string): number {
  const s = (status || "").toLowerCase();

  if (s.includes("delivered")) return 3;
  if (
    s.includes("transit") ||
    s.includes("out for delivery") ||
    s.includes("route")
  )
    return 2;
  if (s.includes("picked") || s.includes("warehouse") || s.includes("shipped"))
    return 1;

  return 0; // Booked / Ready
}

function getStatusChipColor(
  status?: string,
): "success" | "primary" | "info" | "error" | "warning" | "default" {
  const s = (status || "").toLowerCase();

  if (s.includes("delivered")) return "success";
  if (
    s.includes("transit") ||
    s.includes("out for delivery") ||
    s.includes("route")
  )
    return "primary";
  if (s.includes("picked") || s.includes("shipped")) return "info";
  if (
    s.includes("cancel") ||
    s.includes("un-assigned") ||
    s.includes("return") ||
    s.includes("expired")
  )
    return "error";

  return "warning";
}

function formatStatusDisplay(status?: string): string {
  if (!status) return "Booked";
  const s = status.trim();
  const lower = s.toLowerCase();

  if (lower === "un-assigned by me" || lower === "un-assigned") {
    return "Order Cancelled";
  }

  return s;
}

export default function PostExTrackingTimeline({
  trackingNumber,
  currentStatus,
  data,
  loading = false,
  onRefresh,
  showOrderMeta = true,
}: PostExTrackingTimelineProps) {
  const [copied, setCopied] = useState(false);

  // Extract raw details from dist object if present
  const dist = (data?.dist || data || {}) as PostExDistData;

  const activeStatus =
    dist.transactionStatus || dist.orderStatus || currentStatus || "Booked";

  const displayStatus = formatStatusDisplay(activeStatus);

  const isCancelled =
    activeStatus.toLowerCase().includes("cancel") ||
    activeStatus.toLowerCase().includes("un-assigned") ||
    activeStatus.toLowerCase().includes("return") ||
    activeStatus.toLowerCase().includes("expired");

  const stage = resolvePostExStage(activeStatus);

  const historyRaw = dist.transactionStatusHistory || dist.statusHistory || [];

  const history: StatusHistoryItem[] = Array.isArray(historyRaw)
    ? historyRaw
    : [];

  const handleCopy = () => {
    if (!trackingNumber) return;
    navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const trackingUrl = `https://postex.pk/tracking?cn=${encodeURIComponent(trackingNumber)}`;

  const stages = [
    {
      label: "Booked",
      subtitle: "Ready for Pickup",
      icon: <InventoryIcon fontSize="small" />,
    },
    {
      label: "Picked Up",
      subtitle: "Handed to PostEx",
      icon: <LocalShippingIcon fontSize="small" />,
    },
    {
      label: "In Transit",
      subtitle: "On the way",
      icon: <DirectionsBusIcon fontSize="small" />,
    },
    {
      label: "Delivered",
      subtitle: "Parcel Received",
      icon: <CheckCircleIcon fontSize="small" />,
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* HEADER BAR: TRACKING NUMBER & CONTROLS */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, display: "block" }}
          >
            POSTEX TRACKING NUMBER
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "monospace",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {trackingNumber}
            </Typography>
            <Tooltip title={copied ? "Copied!" : "Copy Tracking Number"}>
              <IconButton size="small" onClick={handleCopy} sx={{ p: 0.4 }}>
                <ContentCopyIcon
                  sx={{
                    fontSize: 16,
                    color: copied ? "success.main" : "text.secondary",
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            label={displayStatus}
            color={getStatusChipColor(activeStatus)}
            sx={{ fontWeight: 700, fontSize: "0.825rem", px: 0.5 }}
          />
          <Tooltip title="View Live on PostEx.pk">
            <Button
              component="a"
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              variant="outlined"
              endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 600,
                fontSize: "0.78rem",
              }}
            >
              PostEx.pk
            </Button>
          </Tooltip>
          {onRefresh && (
            <Tooltip title="Refresh Status">
              <IconButton
                size="small"
                onClick={onRefresh}
                disabled={loading}
                sx={{ border: "1px solid #cbd5e1" }}
              >
                {loading ? (
                  <CircularProgress size={16} />
                ) : (
                  <RefreshIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Paper>

      {/* CANCELLED / UNASSIGNED ALERT BANNER */}
      {isCancelled ? (
        <Alert
          severity="error"
          icon={<CancelOutlinedIcon />}
          sx={{ borderRadius: 2.5, fontWeight: 600 }}
        >
          This shipment is marked as <strong>{displayStatus}</strong>. Order
          booking has been cancelled or un-assigned by courier.
        </Alert>
      ) : (
        /* VISUAL STEPPER PROCESS BAR */
        <Box sx={{ py: 1.5, px: 1 }}>
          <Grid container spacing={1} sx={{ position: "relative" }}>
            {stages.map((stg, idx) => {
              const isCompleted = idx <= stage;
              const isCurrent = idx === stage;

              return (
                <Grid item xs={3} key={idx}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      position: "relative",
                    }}
                  >
                    {/* ICON BUBBLE */}
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isCompleted
                          ? isCurrent
                            ? "#0284c7"
                            : "#0284c7"
                          : "#e2e8f0",
                        color: isCompleted ? "#ffffff" : "#94a3b8",
                        boxShadow: isCurrent
                          ? "0 0 0 4px rgba(2, 132, 199, 0.2)"
                          : "none",
                        transition: "all 0.3s ease",
                        zIndex: 2,
                      }}
                    >
                      {stg.icon}
                    </Box>

                    {/* LABELS */}
                    <Typography
                      variant="caption"
                      sx={{
                        mt: 1,
                        fontWeight: isCurrent ? 800 : isCompleted ? 700 : 500,
                        color: isCompleted ? "#0f172a" : "#94a3b8",
                        fontSize: "0.78rem",
                        lineHeight: 1.2,
                      }}
                    >
                      {stg.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.68rem",
                        color: "text.disabled",
                        display: { xs: "none", sm: "block" },
                      }}
                    >
                      {stg.subtitle}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* METADATA SUMMARY CARDS */}
      {showOrderMeta &&
        Boolean(dist.customerName || dist.cityName || dist.deliveryAddress) && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
            }}
          >
            <Stack spacing={1.25}>
              {Boolean(dist.customerName) && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PersonOutlinedIcon
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                  <Typography variant="body2" sx={{ color: "#334155" }}>
                    Recipient: <strong>{dist.customerName}</strong>{" "}
                    {dist.customerPhone ? `(${dist.customerPhone})` : ""}
                  </Typography>
                </Box>
              )}
              {Boolean(dist.deliveryAddress || dist.cityName) && (
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <PlaceOutlinedIcon
                    sx={{ fontSize: 18, color: "text.secondary", mt: 0.2 }}
                  />
                  <Typography variant="body2" sx={{ color: "#334155" }}>
                    Destination:{" "}
                    <strong>
                      {[dist.deliveryAddress, dist.cityName]
                        .filter(Boolean)
                        .join(", ")}
                    </strong>
                  </Typography>
                </Box>
              )}
              {Boolean(dist.invoicePayment) && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PaymentsOutlinedIcon
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                  <Typography variant="body2" sx={{ color: "#334155" }}>
                    COD Invoice Amount:{" "}
                    <strong>
                      PKR {Number(dist.invoicePayment).toLocaleString()}
                    </strong>
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        )}

      {/* STATUS HISTORY TIMELINE */}
      <Box sx={{ mt: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 800, color: "#1e293b", mb: 1.5 }}
        >
          Tracking History ({history.length} Event
          {history.length === 1 ? "" : "s"})
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : history.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              textAlign: "center",
              border: "1px dashed #cbd5e1",
              borderRadius: 2.5,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No detailed history events logged yet. Check back once courier
              updates parcel status.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={0} sx={{ pl: 1 }}>
            {history.map((item, idx) => {
              const rawMessage =
                item.transactionStatusMessage ||
                item.statusMessage ||
                item.orderStatus ||
                "Status Updated";

              const message = formatStatusDisplay(rawMessage);

              const rawDate = item.createdAt || item.timestamp || item.date;

              const formattedDate = rawDate
                ? new Date(rawDate).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              const isFirst = idx === 0;

              return (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    gap: 2,
                    position: "relative",
                    pb: idx < history.length - 1 ? 2.5 : 0,
                  }}
                >
                  {/* VERTICAL CONNECTOR LINE */}
                  {idx < history.length - 1 && (
                    <Box
                      sx={{
                        position: "absolute",
                        left: 7,
                        top: 20,
                        bottom: 0,
                        width: 2,
                        backgroundColor: "#e2e8f0",
                      }}
                    />
                  )}

                  {/* DOT NODE */}
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      backgroundColor: isFirst ? "#0284c7" : "#cbd5e1",
                      border: "3px solid #ffffff",
                      boxShadow: isFirst
                        ? "0 0 0 2px rgba(2, 132, 199, 0.25)"
                        : "none",
                      flexShrink: 0,
                      mt: 0.25,
                      zIndex: 1,
                    }}
                  />

                  {/* CONTENT */}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isFirst ? 700 : 500,
                        color: isFirst ? "#0f172a" : "#475569",
                        fontSize: "0.85rem",
                      }}
                    >
                      {message}
                    </Typography>
                    {formattedDate && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.25 }}
                      >
                        {formattedDate}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
