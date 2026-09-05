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
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import type { ColumnDef } from "../../components/admin/AdminDataTable";
import AdminDataTable from "../../components/admin/AdminDataTable";

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
}

interface OrderSummary {
  totalOrders: number;
  statusCounts: Record<string, number>;
}

type PaymentFilter = "all" | "cod" | "card" | "paid" | "unpaid" | "awaiting" | "failed";

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

  if (status === "pending_payment") {
    return <Chip label="Awaiting payment" color="warning" size="small" variant="outlined" />;
  }
  if (status === "payment_failed" || paymentStatus === "failed") {
    return <Chip label="Failed" color="error" size="small" />;
  }
  if (paymentStatus === "paid") {
    return <Chip label="Paid" color="success" size="small" />;
  }
  if (order.payment_method === "cod") {
    return <Chip label="COD (unpaid)" color="default" size="small" variant="outlined" />;
  }
  return <Chip label="Unpaid" color="warning" size="small" variant="outlined" />;
}

function fulfillmentLabel(status: string, order: Order) {
  const key = status?.toLowerCase();
  if (key === "pending_payment") return "Awaiting payment";
  if (key === "payment_failed") return "Payment failed";
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
  const [summary, setSummary] = useState<OrderSummary>({ totalOrders: 0, statusCounts: {} });
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [copiedTracker, setCopiedTracker] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

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
  }, [page, rowsPerPage, debouncedSearch]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
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
      } else {
        alert(data.message || "Failed to update order status");
      }
    } catch (err) {
      console.error("Error updating order status:", err);
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

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const method = order.payment_method || "cod";
      const paymentStatus = order.payment_status?.toLowerCase();
      const status = order.status?.toLowerCase();

      switch (paymentFilter) {
        case "cod":
          return method === "cod";
        case "card":
          return method === "card";
        case "paid":
          return paymentStatus === "paid";
        case "unpaid":
          return paymentStatus !== "paid" && method !== "cod" && status !== "cancelled";
        case "awaiting":
          return status === "pending_payment";
        case "failed":
          return status === "payment_failed" || paymentStatus === "failed";
        default:
          return true;
      }
    });
  }, [orders, paymentFilter]);

  const pageStats = useMemo(() => {
    const awaitingPayment = orders.filter((o) => o.status === "pending_payment").length;
    const paidOnline = orders.filter((o) => o.payment_status === "paid" && o.payment_method === "card");
    const onlineRevenue = paidOnline.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    return { awaitingPayment, paidOnlineCount: paidOnline.length, onlineRevenue };
  }, [orders]);

  const columns: ColumnDef<Order>[] = [
    {
      id: "_id",
      label: "Order ID",
      minWidth: 100,
      format: (val) => String(val).slice(-8).toUpperCase(),
    },
    { id: "customer_name", label: "Customer", minWidth: 130 },
    {
      id: "address",
      label: "Shipping Address",
      minWidth: 180,
      format: (_val, row) => {
        const parts = [row.address, row.area, row.city, row.province].filter(Boolean);
        return parts.join(", ") || "—";
      },
    },
    {
      id: "payment_method",
      label: "Payment",
      minWidth: 130,
      format: (_val, row) => (
        <Chip
          label={paymentMethodLabel(row.payment_method)}
          size="small"
          color={row.payment_method === "card" ? "primary" : "default"}
          variant={row.payment_method === "card" ? "filled" : "outlined"}
        />
      ),
    },
    {
      id: "payment_status",
      label: "Payment Status",
      minWidth: 140,
      format: (_val, row) => paymentStatusChip(row),
    },
    {
      id: "total_amount",
      label: "Total",
      minWidth: 110,
      format: (val) => `PKR ${Number(val).toLocaleString()}`,
    },
    {
      id: "status",
      label: "Fulfillment",
      minWidth: 160,
      format: (val, row) => (
        <FormControl size="small" variant="outlined" sx={{ minWidth: 140 }}>
          <Select
            value={val || "pending"}
            onChange={(e) => handleStatusChange(row._id as string, e.target.value as string)}
            sx={{ fontSize: "0.85rem", height: 32 }}
            renderValue={(selected) => fulfillmentLabel(String(selected), row)}
          >
            <MenuItem value="pending_payment" disabled={row.payment_status === "paid"}>
              Awaiting Payment
            </MenuItem>
            <MenuItem value="payment_failed">Payment Failed</MenuItem>
            <MenuItem value="pending">Confirmed / Pending</MenuItem>
            <MenuItem value="shipped">Shipped</MenuItem>
            <MenuItem value="delivered">Delivered</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      ),
    },
    {
      id: "safepay_tracker",
      label: "Safepay Tracker",
      minWidth: 160,
      format: (val) => {
        const tracker = val ? String(val) : "";
        if (!tracker) return <Typography variant="body2" color="text.secondary">—</Typography>;
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
              {tracker.slice(0, 12)}…
            </Typography>
            <Tooltip title="Copy tracker ID">
              <IconButton size="small" onClick={() => copyTracker(tracker)}>
                <ContentCopyIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      id: "paid_at",
      label: "Paid At",
      minWidth: 120,
      format: (val) => (val ? new Date(String(val)).toLocaleString() : "—"),
    },
    {
      id: "created_at",
      label: "Order Date",
      minWidth: 120,
      format: (val) => (val ? new Date(String(val)).toLocaleDateString() : "N/A"),
    },
  ];

  const pendingCount = summary.statusCounts?.pending ?? 0;
  const deliveredCount = summary.statusCounts?.delivered ?? 0;
  const awaitingCount = summary.statusCounts?.pending_payment ?? pageStats.awaitingPayment;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Order Fulfillment & Revenues
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
            Track purchases, payment status, Safepay trackers, and fulfillment.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip label={`Total Orders: ${summary.totalOrders}`} color="primary" variant="outlined" size="small" />
            <Chip label={`Pending: ${pendingCount}`} color="warning" size="small" />
            <Chip label={`Awaiting payment: ${awaitingCount}`} color="warning" variant="outlined" size="small" />
            <Chip label={`Paid online (page): ${pageStats.paidOnlineCount}`} color="success" size="small" />
            <Chip label={`Delivered: ${deliveredCount}`} color="success" size="small" />
          </Box>
        </Box>

        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchOrders} sx={{ borderRadius: 2 }}>
          Refresh Orders
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="payment-filter-label">Payment filter</InputLabel>
          <Select
            labelId="payment-filter-label"
            label="Payment filter"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
          >
            <MenuItem value="all">All orders</MenuItem>
            <MenuItem value="card">Card (Safepay)</MenuItem>
            <MenuItem value="cod">Cash on Delivery</MenuItem>
            <MenuItem value="paid">Paid online</MenuItem>
            <MenuItem value="awaiting">Awaiting payment</MenuItem>
            <MenuItem value="failed">Payment failed</MenuItem>
            <MenuItem value="unpaid">Unpaid (non-COD)</MenuItem>
          </Select>
        </FormControl>
        {paymentFilter !== "all" && (
          <Chip
            label={`Showing ${filteredOrders.length} of ${orders.length}`}
            onDelete={() => setPaymentFilter("all")}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      <AdminDataTable
        title="Orders History"
        columns={columns}
        data={paymentFilter === "all" ? orders : filteredOrders}
        searchPlaceholder="Search by customer name..."
        loading={loading}
        serverPagination={{
          total: paymentFilter === "all" ? total : filteredOrders.length,
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
    </Box>
  );
}
