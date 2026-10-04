"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingActionsIcon from "@mui/icons-material/PendingActions";

import type { ColumnDef } from "../AdminDataTable";
import AdminDataTable from "../AdminDataTable";
import { formatDate } from "@/lib/dateUtils";
import { BRAND } from "@/lib/uiBrand";

interface PostExPaymentRecord {
  _id: string;
  customer_name: string;
  phone: string;
  city: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  trackingNumber: string;
  created_at?: string;
}

interface PostExPaymentStats {
  totalBookedCOD: number;
  deliveredCOD: number;
  inTransitCOD: number;
  totalShipments: number;
  remittedCount: number;
}

export default function PostExPaymentsTab() {
  const [records, setRecords] = useState<PostExPaymentRecord[]>([]);

  const [stats, setStats] = useState<PostExPaymentStats>({
    totalBookedCOD: 0,
    deliveredCOD: 0,
    inTransitCOD: 0,
    totalShipments: 0,
    remittedCount: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedTracker, setCopiedTracker] = useState<string | null>(null);

  // Live Status Check Dialog
  const [selectedTracking, setSelectedTracking] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState<boolean>(false);

  const [liveData, setLiveData] = useState<Record<string, unknown> | null>(
    null,
  );

  const [liveError, setLiveError] = useState<string>("");

  const authHeaders = useCallback(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/postex/payments", {
        headers: authHeaders(),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRecords(data.records || []);
        setStats(
          data.stats || {
            totalBookedCOD: 0,
            deliveredCOD: 0,
            inTransitCOD: 0,
            totalShipments: 0,
            remittedCount: 0,
          },
        );
      }
    } catch (err) {
      console.error("Failed to fetch PostEx payment records:", err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const copyTracker = async (tracker: string) => {
    try {
      await navigator.clipboard.writeText(tracker);
      setCopiedTracker(tracker);
      setTimeout(() => setCopiedTracker(null), 2000);
    } catch (error) {
      console.error("Failed to copy tracker:", error);
    }
  };

  const handleCheckLiveStatus = useCallback(
    async (trackingNumber: string) => {
      setSelectedTracking(trackingNumber);
      setLiveLoading(true);
      setLiveData(null);
      setLiveError("");

      try {
        const res = await fetch("/api/admin/postex/payments", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ trackingNumber }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setLiveData(data.data || {});
        } else {
          setLiveError(data.error || "Failed to query PostEx payment status");
        }
      } catch {
        setLiveError("Failed to query PostEx payment status");
      } finally {
        setLiveLoading(false);
      }
    },
    [authHeaders],
  );

  const filteredRecords = useMemo(() => {
    if (statusFilter === "all") return records;
    if (statusFilter === "delivered")
      return records.filter((r) => r.order_status === "delivered");
    if (statusFilter === "in_transit")
      return records.filter(
        (r) => r.order_status === "shipped" || r.order_status === "dispatched",
      );
    if (statusFilter === "paid")
      return records.filter((r) => r.payment_status === "paid");

    return records;
  }, [records, statusFilter]);

  const columns: ColumnDef<PostExPaymentRecord>[] = useMemo(
    () => [
      {
        id: "trackingNumber",
        label: "PostEx Tracking",
        minWidth: 150,
        format: (val) => {
          const tracker = String(val || "");

          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Chip
                label={tracker}
                size="small"
                sx={{
                  fontWeight: 700,
                  backgroundColor: "#042549",
                  color: "#ffffff",
                  fontFamily: "monospace",
                  fontSize: "0.78rem",
                }}
              />
              <Tooltip title="Copy Tracking Number">
                <IconButton size="small" onClick={() => copyTracker(tracker)}>
                  <ContentCopyIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
      {
        id: "_id",
        label: "Order ID",
        minWidth: 100,
        format: (val) => String(val).slice(-8).toUpperCase(),
      },
      { id: "customer_name", label: "Customer", minWidth: 130 },
      { id: "city", label: "City", minWidth: 100 },
      {
        id: "total_amount",
        label: "COD Amount",
        minWidth: 120,
        format: (val) => `PKR ${Number(val).toLocaleString()}`,
      },
      {
        id: "order_status",
        label: "Parcel Status",
        minWidth: 130,
        format: (val) => {
          const st = String(val || "").toLowerCase();

          if (st === "delivered")
            return <Chip label="Delivered" color="success" size="small" />;
          if (st === "shipped" || st === "dispatched")
            return <Chip label="In Transit" color="primary" size="small" />;
          if (st === "cancelled" || st === "returned")
            return (
              <Chip label="Returned / Cancelled" color="error" size="small" />
            );

          return (
            <Chip
              label={st ? st.charAt(0).toUpperCase() + st.slice(1) : "Pending"}
              color="warning"
              size="small"
              variant="outlined"
            />
          );
        },
      },
      {
        id: "payment_status",
        label: "COD Status",
        minWidth: 140,
        format: (val, row) => {
          const isPaid = row.payment_status === "paid";

          if (isPaid) {
            return (
              <Chip
                icon={<CheckCircleIcon fontSize="small" />}
                label="Remitted to Bank"
                color="success"
                size="small"
              />
            );
          }

          if (row.order_status === "delivered") {
            return (
              <Chip
                icon={<PendingActionsIcon fontSize="small" />}
                label="Cash Collected"
                color="info"
                size="small"
              />
            );
          }

          return (
            <Chip
              label="Pending Delivery"
              color="default"
              size="small"
              variant="outlined"
            />
          );
        },
      },
      {
        id: "created_at",
        label: "Booked Date",
        minWidth: 110,
        format: (val) => (val ? formatDate(String(val)) : "—"),
      },
      {
        id: "actions",
        label: "Live Status",
        minWidth: 120,
        align: "center",
        format: (_val, row) => (
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleCheckLiveStatus(row.trackingNumber)}
            sx={{ textTransform: "none", fontSize: "0.75rem", borderRadius: 2 }}
          >
            Check Status
          </Button>
        ),
      },
    ],
    [handleCheckLiveStatus],
  );

  return (
    <Box>
      {/* Header & Refresh */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <AccountBalanceWalletIcon sx={{ color: BRAND.gold, fontSize: 32 }} />
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: BRAND.navy }}
            >
              PostEx Courier Remittance & COD Payments
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track Cash on Delivery collections, delivered parcel totals, and
              PostEx bank remittances.
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => void fetchRecords()}
          disabled={loading}
          sx={{ borderRadius: 2 }}
        >
          Refresh PostEx Payments
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 600, mb: 0.5 }}
            >
              Total Booked COD
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: BRAND.navy }}
            >
              PKR {stats.totalBookedCOD.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stats.totalShipments} PostEx shipments
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              backgroundColor: "#ecfdf5",
              borderColor: "#a7f3d0",
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 600, mb: 0.5 }}
            >
              Delivered Sales COD
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#047857" }}>
              PKR {stats.deliveredCOD.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Delivered parcels awaiting/paid
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              backgroundColor: "#eff6ff",
              borderColor: "#bfdbfe",
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 600, mb: 0.5 }}
            >
              In-Transit COD Volume
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#1d4ed8" }}>
              PKR {stats.inTransitCOD.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Out for delivery / dispatched
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              backgroundColor: "#fffbeb",
              borderColor: "#fde68a",
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 600, mb: 0.5 }}
            >
              Bank Remittance Verified
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#b45309" }}>
              {stats.remittedCount} / {stats.totalShipments}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Marked as paid in system
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter Status</InputLabel>
          <Select
            value={statusFilter}
            label="Filter Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All PostEx Shipments</MenuItem>
            <MenuItem value="delivered">Delivered Only</MenuItem>
            <MenuItem value="in_transit">In-Transit Only</MenuItem>
            <MenuItem value="paid">Remitted to Bank Only</MenuItem>
          </Select>
        </FormControl>

        {copiedTracker && (
          <Chip
            label={`Copied: ${copiedTracker}`}
            color="success"
            size="small"
          />
        )}
      </Box>

      {/* Data Table */}
      <AdminDataTable
        title="PostEx Courier Payment & Remittance Records"
        columns={columns}
        data={filteredRecords}
        searchField="customer_name"
        searchPlaceholder="Search by customer name, phone, or tracking number..."
        loading={loading}
      />

      {/* Live Payment Status Dialog */}
      <Dialog
        open={Boolean(selectedTracking)}
        onClose={() => setSelectedTracking(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: BRAND.navy }}>
          PostEx Live Payment Status
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {liveLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : liveError ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {liveError}
            </Alert>
          ) : liveData ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Tracking Number: <strong>{selectedTracking}</strong>
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, backgroundColor: "#f8fafc" }}
              >
                <pre
                  style={{ margin: 0, fontSize: "0.85rem", overflowX: "auto" }}
                >
                  {JSON.stringify(liveData, null, 2)}
                </pre>
              </Paper>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setSelectedTracking(null)}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
