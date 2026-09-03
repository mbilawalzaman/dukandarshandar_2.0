"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  Paper,
  TextField,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { ColumnDef } from "../../components/admin/AdminDataTable";
import AdminDataTable from "../../components/admin/AdminDataTable";
import type { AdminPaymentRecord, AdminPaymentStats } from "@/types/apps/adminDashboardTypes";

type MethodFilter = "all" | "online" | "card" | "cod";
type StatusFilter = "all" | "paid" | "failed" | "awaiting";

const EMPTY_STATS: AdminPaymentStats = {
  onlineRevenue: 0,
  paidOnlineCount: 0,
  failedCount: 0,
  awaitingCount: 0,
  codRevenue: 0,
  codCount: 0,
  successRate: 0,
  onlineAttempts: 0,
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "Cash on Delivery",
  card: "Card (Safepay)",
  raast: "Raast",
  wallet: "Wallet",
};

function methodLabel(method: string) {
  return PAYMENT_METHOD_LABELS[method] || method.toUpperCase();
}

function paymentStatusChip(record: AdminPaymentRecord) {
  if (record.order_status === "pending_payment") {
    return <Chip label="Awaiting payment" color="warning" size="small" variant="outlined" />;
  }
  if (record.order_status === "payment_failed" || record.payment_status === "failed") {
    return <Chip label="Failed" color="error" size="small" />;
  }
  if (record.payment_status === "paid") {
    return <Chip label="Paid" color="success" size="small" />;
  }
  if (record.payment_method === "cod") {
    return <Chip label="COD (collect on delivery)" color="default" size="small" variant="outlined" />;
  }
  return <Chip label="Unpaid" color="warning" size="small" variant="outlined" />;
}

function fulfillmentChip(status: string) {
  const colors: Record<string, "success" | "primary" | "warning" | "error" | "default"> = {
    pending: "warning",
    shipped: "primary",
    delivered: "success",
    cancelled: "error",
    pending_payment: "warning",
    payment_failed: "error",
  };
  const label = status.replace(/_/g, " ");
  return <Chip label={label.charAt(0).toUpperCase() + label.slice(1)} color={colors[status] || "default"} size="small" variant="outlined" />;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid #e2e8f0",
        height: "100%",
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      )}
    </Paper>
  );
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [stats, setStats] = useState<AdminPaymentStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [copiedTracker, setCopiedTracker] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const params = new URLSearchParams();
      if (methodFilter !== "all") params.set("method", methodFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const qs = params.toString();
      const res = await fetch(`/api/admin/payments${qs ? `?${qs}` : ""}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
        setStats(data.stats || EMPTY_STATS);
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
    } finally {
      setLoading(false);
    }
  }, [methodFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const copyTracker = async (tracker: string) => {
    try {
      await navigator.clipboard.writeText(tracker);
      setCopiedTracker(tracker);
    } catch {
      /* clipboard unavailable */
    }
  };

  const columns: ColumnDef<AdminPaymentRecord>[] = useMemo(
    () => [
      {
        id: "_id",
        label: "Order ID",
        minWidth: 100,
        format: (val) => String(val).slice(-8).toUpperCase(),
      },
      { id: "customer_name", label: "Customer", minWidth: 130 },
      {
        id: "payment_method",
        label: "Method",
        minWidth: 130,
        format: (_val, row) => (
          <Chip
            label={methodLabel(row.payment_method)}
            size="small"
            color={row.payment_method === "card" ? "primary" : "default"}
            variant={row.payment_method === "card" ? "filled" : "outlined"}
          />
        ),
      },
      {
        id: "payment_status",
        label: "Payment Status",
        minWidth: 160,
        format: (_val, row) => paymentStatusChip(row),
      },
      {
        id: "total_amount",
        label: "Amount",
        minWidth: 110,
        format: (val) => `PKR ${Number(val).toLocaleString()}`,
      },
      {
        id: "order_status",
        label: "Fulfillment",
        minWidth: 130,
        format: (val) => fulfillmentChip(String(val)),
      },
      {
        id: "safepay_tracker",
        label: "Safepay Tracker",
        minWidth: 150,
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
        minWidth: 150,
        format: (val, row) => {
          if (val) return new Date(String(val)).toLocaleString();
          if (row.payment_method === "cod") return "On delivery";
          return "—";
        },
      },
      {
        id: "created_at",
        label: "Order Date",
        minWidth: 120,
        format: (val) => (val ? new Date(String(val)).toLocaleDateString() : "—"),
      },
      {
        id: "actions",
        label: "Order",
        minWidth: 80,
        align: "center",
        format: (_val, row) => (
          <Tooltip title={`Order …${String(row._id).slice(-8).toUpperCase()}`}>
            <IconButton size="small" component={Link} href="/admin/orders" color="primary">
              <OpenInNewIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  const hasActiveFilters = methodFilter !== "online" || statusFilter !== "all" || dateFrom || dateTo;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Payments
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
            Online collections, failed attempts, and COD totals — separate from order fulfillment.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPayments} sx={{ borderRadius: 2 }}>
          Refresh
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)", lg: "repeat(5, 1fr)" },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard label="Online Revenue" value={`PKR ${stats.onlineRevenue.toLocaleString()}`} sub="Card payments collected" />
        <StatCard label="Paid Online" value={String(stats.paidOnlineCount)} sub="Successful card payments" />
        <StatCard label="Success Rate" value={`${stats.successRate}%`} sub={`${stats.onlineAttempts} online attempts`} />
        <StatCard label="Failed / Awaiting" value={`${stats.failedCount} / ${stats.awaitingCount}`} sub="Needs follow-up" />
        <StatCard label="COD Total" value={`PKR ${stats.codRevenue.toLocaleString()}`} sub={`${stats.codCount} orders`} />
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="method-filter-label">Method</InputLabel>
          <Select
            labelId="method-filter-label"
            label="Method"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as MethodFilter)}
          >
            <MenuItem value="all">All methods</MenuItem>
            <MenuItem value="online">Online</MenuItem>
            <MenuItem value="card">Card only</MenuItem>
            <MenuItem value="cod">COD only</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="awaiting">Awaiting payment</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="From"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField
          size="small"
          label="To"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />

        {hasActiveFilters && (
          <Chip
            label={`${payments.length} records`}
            onDelete={() => {
              setMethodFilter("online");
              setStatusFilter("all");
              setDateFrom("");
              setDateTo("");
            }}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      <AdminDataTable
        title="Payment Records"
        columns={columns}
        data={payments}
        searchField="customer_name"
        searchPlaceholder="Search by customer name..."
        loading={loading}
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
