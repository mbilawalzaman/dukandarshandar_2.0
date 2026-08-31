"use client";

import React, { useEffect, useState } from "react";
import { Grid, Typography, Box, Button, Paper } from "@mui/material";
import StatCard from "../components/admin/StatCard";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import PeopleIcon from "@mui/icons-material/People";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PaidIcon from "@mui/icons-material/Paid";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeMosaicIcon from "@mui/icons-material/AutoAwesomeMosaic";
import Link from "next/link";
import ProductFormModal from "../components/admin/ProductFormModal";

interface Stats {
  totalProducts: number;
  totalUsers: number;
  totalOrders: number;
  totalEarnings: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch("/api/admin/stats", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Welcome to Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage products, configure page banners, view users, and monitor orders.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            component={Link}
            href="/admin/pages"
            variant="outlined"
            startIcon={<AutoAwesomeMosaicIcon />}
            sx={{ borderRadius: 2, px: 2.5, py: 1.2, fontWeight: 600, borderColor: "#0284c7", color: "#0284c7" }}
          >
            Manage Pages
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsAddModalOpen(true)}
            sx={{ borderRadius: 2, px: 3, py: 1.2, fontWeight: 600, backgroundColor: "#0284c7" }}
          >
            Add Product
          </Button>
        </Box>
      </Box>

      {/* Metric Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Products"
            value={loading ? "..." : stats.totalProducts}
            icon={<ShoppingBagIcon />}
            color="#0284c7"
            subtitle="Active inventory items"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={loading ? "..." : stats.totalUsers}
            icon={<PeopleIcon />}
            color="#8b5cf6"
            subtitle="Registered customer accounts"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Orders"
            value={loading ? "..." : stats.totalOrders}
            icon={<ShoppingCartIcon />}
            color="#f59e0b"
            subtitle="Customer orders placed"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={loading ? "..." : `PKR ${stats.totalEarnings.toLocaleString()}`}
            icon={<PaidIcon />}
            color="#10b981"
            subtitle="Delivered order earnings"
          />
        </Grid>
      </Grid>

      {/* Quick Access Panels */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, height: "100%", borderTop: "4px solid #0284c7", display: "flex", flexDirection: "column" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Products Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flexGrow: 1 }}>
              View, edit, filter, or delete products from the catalog.
            </Typography>
            <Button component={Link} href="/admin/products" variant="outlined" color="primary" fullWidth>
              Manage Products →
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, height: "100%", borderTop: "4px solid #06b6d4", display: "flex", flexDirection: "column" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Page & Banner Setup
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flexGrow: 1 }}>
              Update slider banners, page headings, and product counts per page.
            </Typography>
            <Button component={Link} href="/admin/pages" variant="outlined" sx={{ color: "#0891b2", borderColor: "#0891b2" }} fullWidth>
              Manage Pages →
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, height: "100%", borderTop: "4px solid #8b5cf6", display: "flex", flexDirection: "column" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Users Directory
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flexGrow: 1 }}>
              Inspect registered customer profiles and account details.
            </Typography>
            <Button component={Link} href="/admin/users" variant="outlined" color="secondary" fullWidth>
              Manage Users →
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, height: "100%", borderTop: "4px solid #f59e0b", display: "flex", flexDirection: "column" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Order Fulfillment
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flexGrow: 1 }}>
              Track order statuses, update delivery state, and view revenues.
            </Typography>
            <Button component={Link} href="/admin/orders" variant="outlined" color="warning" fullWidth>
              Manage Orders →
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Product Add Modal */}
      <ProductFormModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchStats();
        }}
      />
    </Box>
  );
}
