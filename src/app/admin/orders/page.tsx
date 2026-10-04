"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Box,
  Typography,
  Chip,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  TextField,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PrintIcon from "@mui/icons-material/Print";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";

import { allowedOrderTransitions } from "@/lib/orderRules";
import {
  startOfDay,
  endOfDay,
  formatDate,
  formatDateTime,
} from "@/lib/dateUtils";
import type { ColumnDef } from "../../components/admin/AdminDataTable";
import AdminDataTable from "../../components/admin/AdminDataTable";
import ShippingLabelModal from "../../components/admin/orders/ShippingLabelModal";
import PostExBookingModal from "@/components/admin/orders/PostExBookingModal";
import BulkPostExBookingModal from "@/components/admin/orders/BulkPostExBookingModal";
import PostExShipperAdviceModal from "@/components/admin/orders/PostExShipperAdviceModal";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  _id: string;
  customer_name: string;
  customer_email: string;
  phone?: string;
  province?: string;
  city?: string;
  area?: string;
  address?: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  payment_method?: string;
  payment_status?: string;
  safepay_tracker?: string | null;
  paid_at?: string;
  created_at?: string;
  postexDetails?: {
    trackingNumber?: string;
    orderStatus?: string;
  };
}

interface OrderSummary {
  totalOrders: number;
  statusCounts: Record<string, number>;
}

type PaymentFilter =
  "all" | "cod" | "card" | "paid" | "unpaid" | "awaiting" | "failed";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "Cash on Delivery",
  card: "Card (Safepay)",
  raast: "Raast",
  wallet: "Wallet",
};

function paymentMethodLabel(method?: string) {
  if (!method) return "COD";

  return PAYMENT_METHOD_LABELS[method] || method.toUpperCase();
}

function paymentStatusChip(order: Order) {
  const status = order.status?.toLowerCase();
  const paymentStatus = order.payment_status?.toLowerCase();

  if (paymentStatus === "refunded")
    return <Chip label="Refund initiated" color="info" size="small" />;

  if (status === "pending_payment") {
    return (
      <Chip
        label="Awaiting payment"
        color="warning"
        size="small"
        variant="outlined"
      />
    );
  }

  if (status === "payment_failed" || paymentStatus === "failed") {
    return <Chip label="Failed" color="error" size="small" />;
  }

  if (paymentStatus === "paid") {
    return <Chip label="Paid" color="success" size="small" />;
  }

  if (order.payment_method === "cod") {
    return (
      <Chip
        label="COD (unpaid)"
        color="default"
        size="small"
        variant="outlined"
      />
    );
  }

  return (
    <Chip label="Unpaid" color="warning" size="small" variant="outlined" />
  );
}

function fulfillmentLabel(status: string, order: Order) {
  const key = (status || "").toLowerCase().replace(/\s+/g, "_");

  if (key === "pending_payment") return "Awaiting payment";
  if (key === "payment_failed") return "Payment failed";
  if (key === "payment_review") return "Payment needs review";
  if (key === "cancelling") return "Cancellation pending";
  if (key === "ready_to_ship") return "Ready to Ship";
  if (key === "pending" && order.payment_status === "paid") return "Confirmed";

  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [total, setTotal] = useState(0);

  const [summary, setSummary] = useState<OrderSummary>({
    totalOrders: 0,
    statusCounts: {},
  });

  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [copiedTracker, setCopiedTracker] = useState<string | null>(null);

  const [selectedOrderForLabel, setSelectedOrderForLabel] =
    useState<Order | null>(null);

  const [labelModalOpen, setLabelModalOpen] = useState(false);

  const [selectedOrderForPostex, setSelectedOrderForPostex] =
    useState<Order | null>(null);

  const [postexModalOpen, setPostexModalOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkPostexModalOpen, setBulkPostexModalOpen] = useState(false);

  const [selectedOrderForShipperAdvice, setSelectedOrderForShipperAdvice] =
    useState<Order | null>(null);

  const [shipperAdviceModalOpen, setShipperAdviceModalOpen] = useState(false);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const handleOpenLabelModal = (order: Order) => {
    setSelectedOrderForLabel(order);
    setLabelModalOpen(true);
  };

  const handleOpenPostexModal = (order: Order) => {
    setSelectedOrderForPostex(order);
    setPostexModalOpen(true);
  };

  const handleOpenShipperAdviceModal = (order: Order) => {
    setSelectedOrderForShipperAdvice(order);
    setShipperAdviceModalOpen(true);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
      });

      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (paymentFilter !== "all") params.set("payment", paymentFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/orders?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();

      if (data.success) {
        setOrders(data.orders || []);
        setTotal(data.pagination?.total ?? 0);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    rowsPerPage,
    debouncedSearch,
    paymentFilter,
    statusFilter,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (
    orderId: string,
    newStatus: string,
    targetOrder?: Order,
  ) => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ _id: orderId, status: newStatus }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        fetchOrders();

        if (newStatus === "shipped" && targetOrder) {
          handleOpenLabelModal(targetOrder);
        }
      } else {
        setToast({
          open: true,
          message: data.message || "Failed to update order status",
          severity: "error",
        });
      }
    } catch (err) {
      console.error("Error updating order status:", err);
      setToast({
        open: true,
        message: "Network error updating order status",
        severity: "error",
      });
    }
  };

  const copyTracker = async (tracker: string) => {
    try {
      await navigator.clipboard.writeText(tracker);
      setCopiedTracker(tracker);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleClearFilters = () => {
    setPaymentFilter("all");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(0);
  };

  const hasActiveFilters =
    paymentFilter !== "all" ||
    statusFilter !== "all" ||
    Boolean(startDate) ||
    Boolean(endDate);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const method = order.payment_method || "cod";
      const paymentStatus = order.payment_status?.toLowerCase();
      const status = (order.status || "").toLowerCase().replace(/\s+/g, "_");

      let matchesPayment = true;

      switch (paymentFilter) {
        case "cod":
          matchesPayment = method === "cod";
          break;
        case "card":
          matchesPayment = method === "card";
          break;
        case "paid":
          matchesPayment = paymentStatus === "paid";
          break;
        case "unpaid":
          matchesPayment =
            paymentStatus !== "paid" &&
            method !== "cod" &&
            status !== "cancelled";
          break;
        case "awaiting":
          matchesPayment = status === "pending_payment";
          break;
        case "failed":
          matchesPayment =
            status === "payment_failed" || paymentStatus === "failed";
          break;
        default:
          matchesPayment = true;
      }

      if (!matchesPayment) return false;

      if (statusFilter !== "all") {
        const targetStatus = statusFilter.toLowerCase();

        if (targetStatus === "pending") {
          if (status !== "pending" && status !== "confirmed") return false;
        } else if (status !== targetStatus) {
          return false;
        }
      }

      if (startDate || endDate) {
        if (!order.created_at) return false;
        const orderDate = new Date(order.created_at);

        if (isNaN(orderDate.getTime())) return false;

        if (startDate) {
          const start = startOfDay(startDate);

          if (orderDate < start) return false;
        }

        if (endDate) {
          const end = endOfDay(endDate);

          if (orderDate > end) return false;
        }
      }

      return true;
    });
  }, [orders, paymentFilter, statusFilter, startDate, endDate]);

  const pageStats = useMemo(() => {
    const awaitingPayment = orders.filter(
      (o) => o.status === "pending_payment",
    ).length;

    const paidOnline = orders.filter(
      (o) => o.payment_status === "paid" && o.payment_method === "card",
    );

    const onlineRevenue = paidOnline.reduce(
      (sum, o) => sum + Number(o.total_amount || 0),
      0,
    );

    return {
      awaitingPayment,
      paidOnlineCount: paidOnline.length,
      onlineRevenue,
    };
  }, [orders]);

  const columns: ColumnDef<Order>[] = [
    {
      id: "_id",
      label: "Order ID",
      minWidth: 80,
      format: (val) => String(val).slice(-8).toUpperCase(),
    },
    { id: "customer_name", label: "Customer", minWidth: 100 },
    {
      id: "address",
      label: "Shipping Address",
      minWidth: 160,
      format: (_val, row) => {
        const parts = [row.address, row.area, row.city, row.province].filter(
          Boolean,
        );

        return parts.join(", ") || "—";
      },
    },
    {
      id: "payment_method",
      label: "Payment",
      minWidth: 95,
      format: (_val, row) => (
        <Chip
          label={paymentMethodLabel(row.payment_method)}
          size="small"
          color={row.payment_method === "card" ? "primary" : "default"}
          variant={row.payment_method === "card" ? "filled" : "outlined"}
          sx={{ fontSize: "0.75rem", height: 24 }}
        />
      ),
    },
    {
      id: "payment_status",
      label: "Payment Status",
      minWidth: 95,
      format: (_val, row) => paymentStatusChip(row),
    },
    {
      id: "total_amount",
      label: "Total",
      minWidth: 80,
      format: (val) => `PKR ${Number(val).toLocaleString()}`,
    },
    {
      id: "status",
      label: "Fulfillment",
      minWidth: 170,
      format: (val, row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <FormControl size="small" variant="outlined" sx={{ minWidth: 115 }}>
            <Select
              value={val || "pending"}
              onChange={(e) =>
                handleStatusChange(
                  row._id as string,
                  e.target.value as string,
                  row,
                )
              }
              sx={{ fontSize: "0.8rem", height: 30, px: 0.5 }}
              renderValue={(selected) =>
                fulfillmentLabel(String(selected), row)
              }
            >
              <MenuItem value={row.status}>
                {fulfillmentLabel(row.status, row)}
              </MenuItem>
              {allowedOrderTransitions(row).map((next) => (
                <MenuItem key={next} value={next}>
                  {fulfillmentLabel(next, row)}
                </MenuItem>
              ))}
              {row.status === "cancelling" && (
                <MenuItem value="cancelled">Retry cancellation</MenuItem>
              )}
            </Select>
          </FormControl>
          {(() => {
            const st = (row.status || "").toLowerCase();
            const isCancelled = st === "cancelled" || st === "payment_failed";

            const canPrint =
              st === "ready_to_ship" || st === "shipped" || st === "delivered";

            if (isCancelled || !canPrint) return null;

            return (
              <Tooltip title="Print Shipping Label (DS)">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenLabelModal(row)}
                    sx={{
                      border: "1px solid #f59e0b",
                      backgroundColor: "#fffbe5",
                      color: "#d97706",
                      borderRadius: "50%",
                      p: 0.4,
                      "&:hover": {
                        backgroundColor: "#fef3c7",
                      },
                    }}
                  >
                    <PrintIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </span>
              </Tooltip>
            );
          })()}
          {(() => {
            const st = (row.status || "").toLowerCase();
            const isCancelled = st === "cancelled" || st === "payment_failed";
            const hasTracking = Boolean(row.postexDetails?.trackingNumber);

            // Hide booking/tracking icon completely for cancelled orders
            if (isCancelled) return null;

            return (
              <Tooltip
                title={
                  hasTracking
                    ? `PostEx: ${row.postexDetails?.trackingNumber}`
                    : "Book with PostEx Courier"
                }
              >
                <IconButton
                  size="small"
                  onClick={() => handleOpenPostexModal(row)}
                  sx={{
                    border: `1px solid ${hasTracking ? "#10b981" : "#3b82f6"}`,
                    backgroundColor: hasTracking ? "#ecfdf5" : "#eff6ff",
                    color: hasTracking ? "#059669" : "#2563eb",
                    borderRadius: "50%",
                    p: 0.4,
                    "&:hover": {
                      backgroundColor: hasTracking ? "#d1fae5" : "#dbeafe",
                    },
                  }}
                >
                  <LocalShippingIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            );
          })()}
          {Boolean(row.postexDetails?.trackingNumber) &&
            row.status !== "cancelled" &&
            row.status !== "delivered" && (
              <Tooltip
                title={`PostEx Shipper Advice (${row.postexDetails?.trackingNumber})`}
              >
                <IconButton
                  size="small"
                  onClick={() => handleOpenShipperAdviceModal(row)}
                  sx={{
                    border: "1px solid #d97706",
                    backgroundColor: "#fffbeb",
                    color: "#d97706",
                    borderRadius: "50%",
                    p: 0.4,
                    "&:hover": {
                      backgroundColor: "#fef3c7",
                    },
                  }}
                >
                  <SupportAgentIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
        </Box>
      ),
    },
    {
      id: "safepay_tracker",
      label: "Safepay Tracker",
      minWidth: 100,
      format: (val) => {
        const tracker = val ? String(val) : "";

        if (!tracker)
          return (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          );

        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="body2"
              sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
            >
              {tracker.slice(0, 10)}…
            </Typography>
            <Tooltip title="Copy tracker ID">
              <IconButton
                size="small"
                onClick={() => copyTracker(tracker)}
                sx={{ p: 0.2 }}
              >
                <ContentCopyIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      id: "paid_at",
      label: "Paid At",
      minWidth: 90,
      format: (val) => (val ? formatDateTime(String(val)) : "—"),
    },
    {
      id: "created_at",
      label: "Order Date",
      minWidth: 85,
      format: (val) => (val ? formatDate(String(val)) : "N/A"),
    },
  ];

  const pendingCount = summary.statusCounts?.pending ?? 0;
  const deliveredCount = summary.statusCounts?.delivered ?? 0;

  const awaitingCount =
    summary.statusCounts?.pending_payment ?? pageStats.awaitingPayment;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 4,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Order Fulfillment & Revenues
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
            Track purchases, payment status, Safepay trackers, and fulfillment.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={`Total Orders: ${summary.totalOrders}`}
              color="primary"
              variant="outlined"
              size="small"
            />
            <Chip
              label={`Pending: ${pendingCount}`}
              color="warning"
              size="small"
            />
            <Chip
              label={`Awaiting payment: ${awaitingCount}`}
              color="warning"
              variant="outlined"
              size="small"
            />
            <Chip
              label={`Paid online (page): ${pageStats.paidOnlineCount}`}
              color="success"
              size="small"
            />
            <Chip
              label={`Delivered: ${deliveredCount}`}
              color="success"
              size="small"
            />
          </Box>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchOrders}
          sx={{ borderRadius: 2 }}
        >
          Refresh Orders
        </Button>
      </Box>

      <Box
        sx={{
          p: 2.5,
          mb: 3,
          backgroundColor: "#ffffff",
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 2,
          }}
        >
          <FilterListIcon sx={{ color: "#475569", fontSize: 20 }} />
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: "#0f172a" }}
          >
            Filter Orders
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <FormControl size="small" sx={{ minWidth: 180, flex: "1 1 180px" }}>
            <InputLabel id="payment-filter-label">Payment Filter</InputLabel>
            <Select
              labelId="payment-filter-label"
              label="Payment Filter"
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value as PaymentFilter);
                setPage(0);
              }}
            >
              <MenuItem value="all">All Payments</MenuItem>
              <MenuItem value="card">Card (Safepay)</MenuItem>
              <MenuItem value="cod">Cash on Delivery</MenuItem>
              <MenuItem value="paid">Paid Online</MenuItem>
              <MenuItem value="awaiting">Awaiting Payment</MenuItem>
              <MenuItem value="failed">Payment Failed</MenuItem>
              <MenuItem value="unpaid">Unpaid (non-COD)</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180, flex: "1 1 180px" }}>
            <InputLabel id="status-filter-label">Order Status</InputLabel>
            <Select
              labelId="status-filter-label"
              label="Order Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="pending">Pending Orders</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="ready_to_ship">Ready to Ship</MenuItem>
              <MenuItem value="shipped">Shipped</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(0);
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160, flex: "1 1 160px" }}
          />

          <TextField
            size="small"
            type="date"
            label="End Date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(0);
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160, flex: "1 1 160px" }}
          />

          {hasActiveFilters && (
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<ClearIcon fontSize="small" />}
              onClick={handleClearFilters}
              sx={{ height: 40, borderRadius: 2, textTransform: "none" }}
            >
              Clear Filters
            </Button>
          )}
        </Box>

        {hasActiveFilters && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              alignItems: "center",
              mt: 2,
              pt: 1.5,
              borderTop: "1px dashed #e2e8f0",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              Active Filters:
            </Typography>

            {paymentFilter !== "all" && (
              <Chip
                label={`Payment: ${paymentFilter}`}
                onDelete={() => setPaymentFilter("all")}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {statusFilter !== "all" && (
              <Chip
                label={`Status: ${statusFilter.replace(/_/g, " ")}`}
                onDelete={() => setStatusFilter("all")}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {startDate && (
              <Chip
                label={`From: ${startDate}`}
                onDelete={() => setStartDate("")}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {endDate && (
              <Chip
                label={`To: ${endDate}`}
                onDelete={() => setEndDate("")}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              label={`Showing ${filteredOrders.length} entries`}
              size="small"
              color="info"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        )}
      </Box>

      <AdminDataTable
        title="Orders History"
        columns={columns}
        data={filteredOrders}
        searchPlaceholder="Search by customer name..."
        loading={loading}
        selectable
        selectedIds={selectedOrderIds}
        onSelectChange={setSelectedOrderIds}
        batchActions={
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<LocalShippingIcon fontSize="small" />}
            onClick={() => setBulkPostexModalOpen(true)}
          >
            Bulk PostEx Actions ({selectedOrderIds.length})
          </Button>
        }
        extraActions={(row) => {
          const st = (row.status || "").toLowerCase();

          if (st === "cancelled" || st === "payment_failed") return [];

          return [
            {
              label: "Print Shipping Label",
              icon: <LocalShippingIcon fontSize="small" />,
              disabled: row.status !== "shipped",
              onClick: () => {
                if (row.status === "shipped") {
                  handleOpenLabelModal(row);
                }
              },
              color:
                row.status === "shipped"
                  ? "var(--theme-primary-main, #0284c7)"
                  : "#94a3b8",
            },
          ];
        }}
        serverPagination={{
          total: total,
          page,
          rowsPerPage,
          searchTerm,
          onPageChange: setPage,
          onRowsPerPageChange: (next) => {
            setRowsPerPage(next);
            setPage(0);
          },
          onSearchChange: (term) => {
            setSearchTerm(term);
            setPage(0);
          },
        }}
      />

      <Snackbar
        open={Boolean(copiedTracker)}
        autoHideDuration={2000}
        onClose={() => setCopiedTracker(null)}
        message="Safepay tracker copied"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />

      <ShippingLabelModal
        open={labelModalOpen}
        onClose={() => setLabelModalOpen(false)}
        order={selectedOrderForLabel}
      />

      <PostExBookingModal
        open={postexModalOpen}
        onClose={() => setPostexModalOpen(false)}
        order={selectedOrderForPostex}
        onSuccess={fetchOrders}
      />

      <BulkPostExBookingModal
        open={bulkPostexModalOpen}
        onClose={() => setBulkPostexModalOpen(false)}
        orders={orders.filter((o) => selectedOrderIds.includes(o._id))}
        onSuccess={fetchOrders}
      />

      <PostExShipperAdviceModal
        open={shipperAdviceModalOpen}
        onClose={() => setShipperAdviceModalOpen(false)}
        order={selectedOrderForShipperAdvice}
        onSuccess={fetchOrders}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
