"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  Drawer,
  Card,
  CardContent,
  Tooltip,
  Snackbar,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import CloseIcon from "@mui/icons-material/Close";
import PageBanner from "../components/PageBanner";
import OrderFilterSidebar, { OrderFilterState } from "../components/orders/OrderFilterSidebar";
import { authHeaders } from "@/lib/cart";
import { BRAND } from "@/lib/constants";

interface OrderItem {
  _id?: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface Order {
  _id: string;
  customer_name: string;
  customer_email?: string;
  phone?: string;
  address?: string;
  city?: string;
  total_amount: number;
  subtotal?: number;
  shipping?: number;
  status: string;
  created_at?: string;
  items: OrderItem[];
}

const INITIAL_FILTERS: OrderFilterState = {
  search: "",
  status: "all",
  timeframe: "all",
  sortBy: "newest",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: "warning" | "info" | "primary" | "success" | "error" | "default"; icon: React.ReactNode; step: number }
> = {
  pending: { label: "Pending", color: "warning", icon: <HourglassEmptyIcon sx={{ fontSize: 16 }} />, step: 1 },
  processing: { label: "Processing", color: "info", icon: <HourglassEmptyIcon sx={{ fontSize: 16 }} />, step: 2 },
  shipped: { label: "Shipped", color: "primary", icon: <LocalShippingOutlinedIcon sx={{ fontSize: 16 }} />, step: 3 },
  delivered: { label: "Delivered", color: "success", icon: <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />, step: 4 },
  cancelled: { label: "Cancelled", color: "error", icon: <CancelOutlinedIcon sx={{ fontSize: 16 }} />, step: 0 },
};

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<OrderFilterState>(INITIAL_FILTERS);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const params = useSearchParams();
  const router = useRouter();
  const placed = params.get("placed");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push("/login?next=/orders");
      return;
    }

    const loadOrders = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/orders", { headers: authHeaders() });
        const data = await res.json();
        if (data.success) {
          setOrders(data.orders || []);
        } else {
          setError(data.message || "Could not load orders");
        }
      } catch {
        setError("Network error loading orders");
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, [router]);

  const handleFilterChange = <K extends keyof OrderFilterState>(key: K, value: OrderFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search.trim() !== "" ||
      filters.status !== "all" ||
      filters.timeframe !== "all" ||
      filters.sortBy !== "newest"
    );
  }, [filters]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    orders.forEach((o) => {
      const s = o.status?.toLowerCase() || "pending";
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [orders]);

  // Overall KPIs
  const stats = useMemo(() => {
    const totalSpent = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const activeCount = orders.filter((o) => ["pending", "processing", "shipped"].includes(o.status?.toLowerCase())).length;
    const deliveredCount = orders.filter((o) => o.status?.toLowerCase() === "delivered").length;

    return {
      totalOrders: orders.length,
      totalSpent,
      activeCount,
      deliveredCount,
    };
  }, [orders]);

  // Filtered & Sorted Orders
  const filteredOrders = useMemo(() => {
    let list = [...orders];

    // 1. Search filter
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase().trim();
      list = list.filter((order) => {
        const orderIdMatch = String(order._id).toLowerCase().includes(query);
        const itemMatch = order.items?.some((it) => it.name.toLowerCase().includes(query));
        const cityMatch = order.city?.toLowerCase().includes(query);
        return orderIdMatch || itemMatch || cityMatch;
      });
    }

    // 2. Status filter
    if (filters.status !== "all") {
      list = list.filter((order) => (order.status?.toLowerCase() || "pending") === filters.status);
    }

    // 3. Timeframe filter
    if (filters.timeframe !== "all") {
      const now = new Date().getTime();
      list = list.filter((order) => {
        if (!order.created_at) return true;
        const orderTime = new Date(order.created_at).getTime();
        const diffDays = (now - orderTime) / (1000 * 3600 * 24);

        if (filters.timeframe === "30days") return diffDays <= 30;
        if (filters.timeframe === "3months") return diffDays <= 90;
        if (filters.timeframe === "6months") return diffDays <= 180;
        if (filters.timeframe === "thisYear") {
          return new Date(order.created_at).getFullYear() === new Date().getFullYear();
        }
        return true;
      });
    }

    // 4. Sort
    list.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      const amountA = Number(a.total_amount) || 0;
      const amountB = Number(b.total_amount) || 0;

      if (filters.sortBy === "oldest") return dateA - dateB;
      if (filters.sortBy === "amount_desc") return amountB - amountA;
      if (filters.sortBy === "amount_asc") return amountA - amountB;
      return dateB - dateA; // Default newest
    });

    return list;
  }, [orders, filters]);

  const copyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <Box sx={{ backgroundColor: "#f8fafc", minHeight: "100vh", pb: 8 }}>
      <PageBanner title="My Orders" subtitle="Track deliveries, view receipts, and manage your purchase history" />

      <Container maxWidth="xl" sx={{ mt: { xs: 3, md: 4 } }}>
        {placed && (
          <Alert severity="success" sx={{ mb: 4, borderRadius: 3, fontWeight: 600 }}>
            🎉 Your order has been placed successfully! Thank you for shopping with Dukandar Shandar.
          </Alert>
        )}

        {/* TOP SUMMARY STATS */}
        {!loading && orders.length > 0 && (
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: "#eff6ff", color: "#0284c7" }}>
                  <ShoppingBagOutlinedIcon fontSize="medium" />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    TOTAL ORDERS
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.navy }}>
                    {stats.totalOrders}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: "#fffbeb", color: "#d97706" }}>
                  <HourglassEmptyIcon fontSize="medium" />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    IN PROGRESS
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.navy }}>
                    {stats.activeCount}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: "#ecfdf5", color: "#10b981" }}>
                  <CheckCircleOutlineIcon fontSize="medium" />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    DELIVERED
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.navy }}>
                    {stats.deliveredCount}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: "#f5f3ff", color: "#8b5cf6" }}>
                  <LocalShippingOutlinedIcon fontSize="medium" />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    TOTAL SPENT
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.navy }}>
                    PKR {stats.totalSpent.toLocaleString()}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* MAIN ORDERS SECTION (SIDEBAR + CONTENT) */}
        <Grid container spacing={3.5}>
          {/* DESKTOP FILTER SIDEBAR */}
          <Grid item xs={12} md={3.5} lg={3} sx={{ display: { xs: "none", md: "block" } }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                position: "sticky",
                top: 90,
              }}
            >
              <OrderFilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
                hasActiveFilters={hasActiveFilters}
                statusCounts={statusCounts}
                totalOrders={orders.length}
              />
            </Paper>
          </Grid>

          {/* MAIN ORDERS FEED */}
          <Grid item xs={12} md={8.5} lg={9}>
            {/* Mobile Filter Button & Results Count Header */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5, flexWrap: "wrap", gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: BRAND.navy }}>
                {filteredOrders.length} {filteredOrders.length === 1 ? "Order" : "Orders"} Found
              </Typography>

              <Button
                variant="outlined"
                startIcon={<TuneIcon />}
                onClick={() => setMobileDrawerOpen(true)}
                sx={{
                  display: { xs: "flex", md: "none" },
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                Filters {hasActiveFilters ? "• Active" : ""}
              </Button>
            </Box>

            {/* LOADING STATE */}
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 12 }}>
                <CircularProgress size={44} sx={{ color: BRAND.gold }} />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ borderRadius: 3 }}>
                {error}
              </Alert>
            ) : orders.length === 0 ? (
              /* EMPTY STATE: NO ORDERS EVER */
              <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3, border: "1px solid #e2e8f0" }}>
                <ShoppingBagOutlinedIcon sx={{ fontSize: 64, color: "#cbd5e1", mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.navy, mb: 1 }}>
                  No orders placed yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: "auto", mb: 3 }}>
                  Discover premium stationery, art craft supplies, and fun essentials for your workspace.
                </Typography>
                <Button
                  component={Link}
                  href="/shop"
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    borderRadius: 2,
                    px: 3.5,
                    py: 1.2,
                    fontWeight: 700,
                    backgroundColor: BRAND.gold,
                    color: BRAND.navy,
                    "&:hover": { backgroundColor: BRAND.goldHover },
                  }}
                >
                  Start Shopping
                </Button>
              </Paper>
            ) : filteredOrders.length === 0 ? (
              /* EMPTY STATE: NO FILTER MATCHES */
              <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3, border: "1px solid #e2e8f0" }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND.navy, mb: 1 }}>
                  No orders match your filter criteria
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Try adjusting your search keywords, status, or date range.
                </Typography>
                <Button variant="outlined" onClick={handleResetFilters} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
                  Reset All Filters
                </Button>
              </Paper>
            ) : (
              /* ORDER CARDS LIST */
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {filteredOrders.map((order) => {
                  const statusKey = order.status?.toLowerCase() || "pending";
                  const statusInfo = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
                  const displayId = String(order._id).slice(-8).toUpperCase();
                  const fullId = String(order._id);
                  const orderDate = order.created_at ? new Date(order.created_at) : null;

                  return (
                    <Card
                      key={order._id}
                      sx={{
                        borderRadius: 3,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                        overflow: "hidden",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                        "&:hover": {
                          boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
                        },
                      }}
                    >
                      {/* CARD HEADER */}
                      <Box
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          backgroundColor: "#f8fafc",
                          borderBottom: "1px solid #e2e8f0",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 1.5,
                        }}
                      >
                        {/* Left: ID & Date */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: BRAND.navy, letterSpacing: 0.5 }}>
                              Order #{displayId}
                            </Typography>
                            <Tooltip title={copiedId === fullId ? "Copied!" : "Copy Full Order ID"}>
                              <IconButton size="small" onClick={() => copyOrderId(fullId)}>
                                <ContentCopyIcon sx={{ fontSize: 15, color: copiedId === fullId ? "success.main" : "text.secondary" }} />
                              </IconButton>
                            </Tooltip>
                          </Box>

                          {orderDate && (
                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
                              • {orderDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at{" "}
                              {orderDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </Typography>
                          )}
                        </Box>

                        {/* Right: Status Badge */}
                        <Chip
                          icon={statusInfo.icon as React.ReactElement}
                          label={statusInfo.label}
                          color={statusInfo.color}
                          size="small"
                          sx={{ fontWeight: 700, px: 0.5, fontSize: "0.8rem" }}
                        />
                      </Box>

                      {/* CARD BODY: ORDER ITEMS & DETAILS */}
                      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        {/* ITEMS LIST */}
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
                          {order.items?.map((item, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 2,
                                py: 1,
                                borderBottom: idx < order.items.length - 1 ? "1px dashed #f1f5f9" : "none",
                              }}
                            >
                              {/* Thumbnail + Name */}
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
                                <Box
                                  sx={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 2.5,
                                    backgroundColor: "#ffffff",
                                    position: "relative",
                                    overflow: "hidden",
                                    flexShrink: 0,
                                    border: "1px solid #e2e8f0",
                                    p: 0.5,
                                  }}
                                >
                                  <Image
                                    src={item.image || "/images/ds-icon.png"}
                                    alt={item.name}
                                    fill
                                    style={{ objectFit: "contain", padding: 4 }}
                                    unoptimized
                                  />
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography
                                    component={item._id ? Link : "p"}
                                    href={item._id ? `/products/${item._id}` : "#"}
                                    variant="body2"
                                    sx={{
                                      fontWeight: 700,
                                      color: BRAND.navy,
                                      textDecoration: "none",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      display: "block",
                                      "&:hover": item._id ? { color: "primary.main", textDecoration: "underline" } : {},
                                    }}
                                  >
                                    {item.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                                    Qty: <strong>{item.quantity}</strong> × PKR {Number(item.price).toLocaleString()}
                                  </Typography>
                                </Box>
                              </Box>

                              {/* Item Total */}
                              <Typography variant="body2" sx={{ fontWeight: 700, color: BRAND.navy, whiteSpace: "nowrap" }}>
                                PKR {(item.price * item.quantity).toLocaleString()}
                              </Typography>
                            </Box>
                          ))}
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {/* FOOTER: SHIPPING ADDRESS & GRAND TOTAL */}
                        <Grid container spacing={2} sx={{ alignItems: "center" }}>
                          {/* Left: Shipping Destination */}
                          <Grid item xs={12} sm={7}>
                            {order.address && (
                              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                                <PlaceOutlinedIcon sx={{ fontSize: 18, color: "#64748b", mt: 0.2 }} />
                                <Box>
                                  <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569" }}>
                                    DELIVERY ADDRESS
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: "#334155", fontSize: "0.85rem" }}>
                                    {order.address}, {order.city}
                                  </Typography>
                                  {order.phone && (
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                                      <PhoneOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                                      <Typography variant="caption" color="text.secondary">
                                        {order.phone}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                            )}
                          </Grid>

                          {/* Right: Price Total & Support Shortcut */}
                          <Grid item xs={12} sm={5}>
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "flex-start", sm: "flex-end" }, gap: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Total Amount Paid
                              </Typography>
                              <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.navy }}>
                                PKR {Number(order.total_amount).toLocaleString()}
                              </Typography>

                              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                                <Button
                                  component={Link}
                                  href="/shop"
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    textTransform: "none",
                                    fontSize: "0.78rem",
                                    borderRadius: 1.5,
                                    fontWeight: 600,
                                  }}
                                >
                                  Buy More
                                </Button>
                                <Button
                                  component={Link}
                                  href="/contact"
                                  size="small"
                                  color="inherit"
                                  startIcon={<SupportAgentIcon fontSize="small" />}
                                  sx={{
                                    textTransform: "none",
                                    fontSize: "0.78rem",
                                    color: "text.secondary",
                                  }}
                                >
                                  Help
                                </Button>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* MOBILE FILTER DRAWER */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        PaperProps={{
          sx: { width: 300, p: 3 },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Filters
          </Typography>
          <IconButton size="small" onClick={() => setMobileDrawerOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <OrderFilterSidebar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          statusCounts={statusCounts}
          totalOrders={orders.length}
        />
        <Button
          variant="contained"
          fullWidth
          onClick={() => setMobileDrawerOpen(false)}
          sx={{
            mt: 3,
            fontWeight: 700,
            borderRadius: 2,
            backgroundColor: BRAND.navy,
            color: "#ffffff",
          }}
        >
          Apply Filters
        </Button>
      </Drawer>

      {/* Toast Notification for ID copy */}
      <Snackbar
        open={Boolean(copiedId)}
        autoHideDuration={2500}
        onClose={() => setCopiedId(null)}
        message="Order ID copied to clipboard"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
          <CircularProgress size={44} sx={{ color: BRAND.gold }} />
        </Box>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
