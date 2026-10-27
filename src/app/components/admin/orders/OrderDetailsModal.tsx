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
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PrintIcon from "@mui/icons-material/Print";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { authFetch } from "@/lib/authFetch";
import { formatDateTime } from "@/lib/dateUtils";
import type { OrderType } from "@/types/apps/orderTypes";
import ParcelTrackingModal from "@/app/components/orders/ParcelTrackingModal";

export interface OrderDetailsModalProps {
  open: boolean;
  onClose: () => void;
  order?: OrderType | null;
  orderId?: string | null;
  onPrintLabel?: (order: OrderType) => void;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "Cash on Delivery",
  card: "Card (Safepay)",
  raast: "Raast",
  wallet: "Wallet",
};

function getPaymentMethodLabel(method?: string) {
  if (!method) return "COD";

  return PAYMENT_METHOD_LABELS[method.toLowerCase()] || method.toUpperCase();
}

function getFulfillmentChip(status?: string) {
  const st = (status || "pending").toLowerCase();

  const colors: Record<
    string,
    "success" | "primary" | "warning" | "error" | "default"
  > = {
    pending: "warning",
    pending_payment: "warning",
    confirmed: "primary",
    ready_to_ship: "primary",
    shipped: "primary",
    delivered: "success",
    cancelled: "error",
    payment_failed: "error",
  };

  const label = status ? status.replace(/_/g, " ") : "Pending";
  const formatted = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <Chip
      label={formatted}
      color={colors[st] || "default"}
      size="small"
      variant="outlined"
      sx={{ fontWeight: 700, fontSize: "0.75rem" }}
    />
  );
}

function getPaymentStatusChip(order: OrderType) {
  const pStatus = (order.payment_status || "").toLowerCase();
  const oStatus = (order.status || "").toLowerCase();

  if (pStatus === "refunded")
    return (
      <Chip
        label="Refund initiated"
        color="info"
        size="small"
        sx={{ fontWeight: 700, fontSize: "0.75rem" }}
      />
    );

  if (oStatus === "pending_payment")
    return (
      <Chip
        label="Awaiting payment"
        color="warning"
        size="small"
        variant="outlined"
        sx={{ fontWeight: 700, fontSize: "0.75rem" }}
      />
    );

  if (oStatus === "payment_failed" || pStatus === "failed")
    return (
      <Chip
        label="Failed"
        color="error"
        size="small"
        sx={{ fontWeight: 700, fontSize: "0.75rem" }}
      />
    );

  if (pStatus === "paid")
    return (
      <Chip
        label="Paid"
        color="success"
        size="small"
        sx={{ fontWeight: 700, fontSize: "0.75rem" }}
      />
    );

  if (order.payment_method?.toLowerCase() === "cod")
    return (
      <Chip
        label="COD (unpaid)"
        color="default"
        size="small"
        variant="outlined"
        sx={{ fontWeight: 700, fontSize: "0.75rem" }}
      />
    );

  return (
    <Chip
      label="Unpaid"
      color="warning"
      size="small"
      variant="outlined"
      sx={{ fontWeight: 700, fontSize: "0.75rem" }}
    />
  );
}

export default function OrderDetailsModal({
  open,
  onClose,
  order: initialOrder,
  orderId,
  onPrintLabel,
}: OrderDetailsModalProps) {
  const [activeOrder, setActiveOrder] = useState<OrderType | null>(
    initialOrder || null,
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedTracker, setCopiedTracker] = useState(false);
  const [copiedTrackingNo, setCopiedTrackingNo] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);

  useEffect(() => {
    setActiveOrder(null);
    setError(null);
    setLoading(false);
    setTrackingModalOpen(false);
    setCopiedId(false);
    setCopiedTracker(false);
    setCopiedTrackingNo(false);
    if (!open) return;

    if (initialOrder) {
      setActiveOrder(initialOrder);

      return;
    }

    if (!orderId) return;

    const controller = new AbortController();
    let active = true;

    const fetchOrder = async (): Promise<void> => {
      setLoading(true);

      try {
        const res = await authFetch(`/api/orders/${orderId}`, {
          signal: controller.signal,
        });

        const data = await res.json();

        if (!res.ok || !data.success)
          throw new Error(
            data.message || data.error || "Failed to load order details",
          );
        if (active) setActiveOrder(data.order);
      } catch (error: unknown) {
        if (active && !controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load order details",
          );
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchOrder();

    return () => {
      active = false;
      controller.abort();
    };
  }, [open, initialOrder, orderId]);

  const handleCopy = async (
    text: string,
    type: "id" | "tracker" | "tracking",
  ) => {
    try {
      await navigator.clipboard.writeText(text);

      if (type === "id") {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else if (type === "tracker") {
        setCopiedTracker(true);
        setTimeout(() => setCopiedTracker(false), 2000);
      } else {
        setCopiedTrackingNo(true);
        setTimeout(() => setCopiedTrackingNo(false), 2000);
      }
    } catch {
      /* clipboard unavailable */
    }
  };

  const trackingNumber =
    activeOrder?.postexDetails?.trackingNumber ||
    activeOrder?.trackingNumber ||
    "";

  const addressParts = [
    activeOrder?.address,
    activeOrder?.area,
    activeOrder?.city,
    activeOrder?.province,
  ].filter(Boolean);

  const fullAddress = addressParts.join(", ") || "—";

  const orderStatus = (activeOrder?.status || "").toLowerCase();

  const canPrintLabel =
    activeOrder &&
    orderStatus !== "cancelled" &&
    orderStatus !== "payment_failed" &&
    Boolean(onPrintLabel);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            maxHeight: "92vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                backgroundColor: "#eff6ff",
                color: "#0284c7",
                display: "flex",
              }}
            >
              <ReceiptLongOutlinedIcon fontSize="small" />
            </Box>
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    fontSize: "1.15rem",
                    color: "#0f172a",
                  }}
                >
                  Order #
                  {activeOrder
                    ? String(activeOrder._id).slice(-8).toUpperCase()
                    : ""}
                </Typography>
                {activeOrder && (
                  <Tooltip title={copiedId ? "Copied!" : "Copy Full ID"}>
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(activeOrder._id, "id")}
                      sx={{ p: 0.3 }}
                    >
                      {copiedId ? (
                        <CheckIcon sx={{ fontSize: 15, color: "#10b981" }} />
                      ) : (
                        <ContentCopyIcon sx={{ fontSize: 15 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                )}
                {activeOrder && getFulfillmentChip(activeOrder.status)}
                {activeOrder && getPaymentStatusChip(activeOrder)}
              </Box>
              {activeOrder?.created_at && (
                <Typography variant="caption" color="text.secondary">
                  Placed on {formatDateTime(activeOrder.created_at)}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: "text.secondary" }}
            aria-label="Close order details modal"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          {loading ? (
            <Box
              sx={{
                py: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <CircularProgress size={36} />
              <Typography color="text.secondary">
                Loading order details...
              </Typography>
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ my: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          ) : !activeOrder ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography color="text.secondary">Order not found.</Typography>
            </Box>
          ) : (
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}
            >
              {/* Cards Grid: Customer & Delivery Address */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 2,
                }}
              >
                {/* Customer Details */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      color: "#334155",
                      mb: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <PersonOutlineIcon
                      sx={{ fontSize: 18, color: "#0284c7" }}
                    />
                    Customer Details
                  </Typography>
                  <Divider sx={{ mb: 1.5 }} />

                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Name:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: "#0f172a" }}
                      >
                        {activeOrder.customer_name || "Guest Customer"}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Email:
                      </Typography>
                      <Typography
                        variant="body2"
                        component="a"
                        href={
                          activeOrder.customer_email
                            ? `mailto:${activeOrder.customer_email}`
                            : undefined
                        }
                        sx={{
                          fontWeight: 600,
                          color: activeOrder.customer_email
                            ? "#0284c7"
                            : "text.secondary",
                          textDecoration: "none",
                        }}
                      >
                        {activeOrder.customer_email || "Not provided"}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Phone:
                      </Typography>
                      <Typography
                        variant="body2"
                        component="a"
                        href={
                          activeOrder.phone
                            ? `tel:${activeOrder.phone}`
                            : undefined
                        }
                        sx={{
                          fontWeight: 600,
                          color: activeOrder.phone
                            ? "#0284c7"
                            : "text.secondary",
                          textDecoration: "none",
                        }}
                      >
                        {activeOrder.phone || "Not provided"}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                {/* Delivery Address */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      color: "#334155",
                      mb: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <LocalShippingOutlinedIcon
                      sx={{ fontSize: 18, color: "#10b981" }}
                    />
                    Shipping & Delivery
                  </Typography>
                  <Divider sx={{ mb: 1.5 }} />

                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Destination:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: "#0f172a" }}
                      >
                        {activeOrder.city
                          ? `${activeOrder.city}${activeOrder.province ? `, ${activeOrder.province}` : ""}`
                          : "Pakistan"}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Full Address:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          color: "#1e293b",
                          backgroundColor: "#f8fafc",
                          p: 1,
                          borderRadius: 1.5,
                          border: "1px solid #f1f5f9",
                        }}
                      >
                        {fullAddress}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>

              {/* Cards Grid: Payment Details & Courier / Tracking */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 2,
                }}
              >
                {/* Payment Breakdown Card */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      color: "#334155",
                      mb: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <PaymentOutlinedIcon
                      sx={{ fontSize: 18, color: "#f59e0b" }}
                    />
                    Payment Details
                  </Typography>
                  <Divider sx={{ mb: 1.5 }} />

                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Payment Method:
                      </Typography>
                      <Chip
                        label={getPaymentMethodLabel(
                          activeOrder.payment_method,
                        )}
                        size="small"
                        color={
                          activeOrder.payment_method === "card"
                            ? "primary"
                            : "default"
                        }
                        variant={
                          activeOrder.payment_method === "card"
                            ? "filled"
                            : "outlined"
                        }
                        sx={{
                          height: 22,
                          fontSize: "0.75rem",
                          fontWeight: 600,
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
                        Payment Status:
                      </Typography>
                      {getPaymentStatusChip(activeOrder)}
                    </Box>
                    {activeOrder.safepay_tracker && (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Safepay Tracker:
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.8rem",
                              color: "#475569",
                            }}
                          >
                            {activeOrder.safepay_tracker.slice(0, 14)}…
                          </Typography>
                          <Tooltip
                            title={
                              copiedTracker ? "Copied!" : "Copy Tracker ID"
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleCopy(
                                  activeOrder.safepay_tracker!,
                                  "tracker",
                                )
                              }
                              sx={{ p: 0.2 }}
                            >
                              {copiedTracker ? (
                                <CheckIcon
                                  sx={{ fontSize: 14, color: "#10b981" }}
                                />
                              ) : (
                                <ContentCopyIcon sx={{ fontSize: 14 }} />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    )}
                    {activeOrder.paid_at && (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Paid At:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: "#0f172a" }}
                        >
                          {formatDateTime(activeOrder.paid_at)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>

                {/* Courier / PostEx Tracking Card */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      color: "#334155",
                      mb: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <LocalShippingOutlinedIcon
                      sx={{ fontSize: 18, color: "#8b5cf6" }}
                    />
                    Courier Fulfillment
                  </Typography>
                  <Divider sx={{ mb: 1.5 }} />

                  {trackingNumber ? (
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Tracking Number:
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: "#0284c7",
                            }}
                          >
                            {trackingNumber}
                          </Typography>
                          <Tooltip
                            title={
                              copiedTrackingNo ? "Copied!" : "Copy Tracking #"
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleCopy(trackingNumber, "tracking")
                              }
                              sx={{ p: 0.2 }}
                            >
                              {copiedTrackingNo ? (
                                <CheckIcon
                                  sx={{ fontSize: 14, color: "#10b981" }}
                                />
                              ) : (
                                <ContentCopyIcon sx={{ fontSize: 14 }} />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Courier Status:
                        </Typography>
                        <Chip
                          label={
                            activeOrder.postexDetails?.orderStatus ||
                            activeOrder.postexStatus ||
                            "Booked"
                          }
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{
                            height: 22,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setTrackingModalOpen(true)}
                        sx={{
                          mt: 0.5,
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                        }}
                      >
                        View Live Tracking Timeline
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ py: 1.5, textAlign: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        No PostEx tracking booked for this order yet.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Box>

              {/* Items Ordered Table */}
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid #e2e8f0",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, color: "#334155" }}
                  >
                    Products & Items ({activeOrder.items?.length || 0})
                  </Typography>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#fafafa" }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.8rem" }}>
                        Product
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                      >
                        Quantity
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                      >
                        Unit Price
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                      >
                        Total
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeOrder.items?.map((item, index) => {
                      const lineTotal =
                        Number(item.price || 0) * Number(item.quantity || 1);

                      return (
                        <TableRow key={index} hover>
                          <TableCell sx={{ py: 1.25 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: "#0f172a" }}
                            >
                              {item.name}
                            </Typography>
                            {item.variationName && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Variation: {item.variationName}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1.25 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                            >
                              {item.quantity}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1.25 }}>
                            <Typography variant="body2">
                              PKR {Number(item.price || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1.25 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, color: "#0f172a" }}
                            >
                              PKR {lineTotal.toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>

              {/* Order Financials & Pricing Summary */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  alignSelf: "flex-end",
                  width: { xs: "100%", sm: 360 },
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {activeOrder.subtotal !== undefined && (
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Subtotal:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        PKR {Number(activeOrder.subtotal).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  {activeOrder.shipping !== undefined && (
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Shipping:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {activeOrder.shipping === 0
                          ? "Free"
                          : `PKR ${Number(activeOrder.shipping).toLocaleString()}`}
                      </Typography>
                    </Box>
                  )}
                  {Boolean(
                    activeOrder.discount_total || activeOrder.discount_amount,
                  ) && (
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="success.main">
                        Discount{" "}
                        {activeOrder.discount_code
                          ? `(${activeOrder.discount_code})`
                          : ""}
                        :
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: "success.main" }}
                      >
                        - PKR{" "}
                        {Number(
                          activeOrder.discount_total ||
                            activeOrder.discount_amount ||
                            0,
                        ).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  <Divider sx={{ my: 0.5 }} />
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 800, color: "#0f172a" }}
                    >
                      Total Amount:
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 800, color: "primary.main" }}
                    >
                      PKR{" "}
                      {Number(activeOrder.total_amount || 0).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            px: 2.5,
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Box>
            {canPrintLabel && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<PrintIcon fontSize="small" />}
                onClick={() => onPrintLabel!(activeOrder!)}
                sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
              >
                Print Shipping Label
              </Button>
            )}
          </Box>
          <Button
            onClick={onClose}
            variant="contained"
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              textTransform: "none",
              px: 3,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Live PostEx Tracking Timeline Modal */}
      {trackingModalOpen && (
        <ParcelTrackingModal
          open={trackingModalOpen}
          onClose={() => setTrackingModalOpen(false)}
          orderId={activeOrder?._id}
          trackingNumber={trackingNumber}
          orderNumber={activeOrder?._id.slice(-8).toUpperCase()}
        />
      )}
    </>
  );
}
