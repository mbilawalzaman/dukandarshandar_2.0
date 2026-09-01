"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Typography, Box, Button, CircularProgress } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ProductFormModal, { ProductFormData } from "@/app/components/admin/ProductFormModal";
import DashboardMetricsGrid from "@/app/components/admin/DashboardMetricsGrid";
import InventoryAlertWidget from "@/app/components/admin/InventoryAlertWidget";
import DashboardCharts from "@/app/components/admin/DashboardCharts";
import RecentActivityFeed from "@/app/components/admin/RecentActivityFeed";
import DashboardQuickActions from "@/app/components/admin/DashboardQuickActions";
import { AdminDashboardStats } from "@/types/admin";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats>({
    totalProducts: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalEarnings: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    lowStockProducts: [],
    salesTrend: [],
    categoryDistribution: [],
    orderStatusBreakdown: [],
    paymentBreakdown: [],
    recentOrders: [],
    recentUsers: [],
  });
  const [loading, setLoading] = useState(true);

  // Quick Restock modal state
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState<ProductFormData | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleOpenRestock = (product: ProductFormData) => {
    setRestockProduct(product);
    setIsRestockModalOpen(true);
  };

  const handleRestockSuccess = () => {
    setIsRestockModalOpen(false);
    setRestockProduct(null);
    fetchStats();
  };

  return (
    <Box>
      {/* Header section */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Overview of your Dukandar Shandar ecommerce store, inventory health, and analytics.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={fetchStats}
          disabled={loading}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Metric Cards */}
      <DashboardMetricsGrid stats={stats} loading={loading} />

      {/* Inventory Alerts Banner */}
      <InventoryAlertWidget
        lowStockCount={stats.lowStockCount}
        outOfStockCount={stats.outOfStockCount}
        lowStockProducts={stats.lowStockProducts}
        onRestockClick={handleOpenRestock}
      />

      {/* Visual Analytics & Charts */}
      <DashboardCharts
        salesTrend={stats.salesTrend}
        categoryDistribution={stats.categoryDistribution}
        orderStatusBreakdown={stats.orderStatusBreakdown}
        paymentBreakdown={stats.paymentBreakdown}
        loading={loading}
      />

      {/* Recent Orders & New Customers Feed */}
      <RecentActivityFeed
        recentOrders={stats.recentOrders}
        recentUsers={stats.recentUsers}
      />

      {/* Quick Action Navigation Tiles */}
      <DashboardQuickActions />

      {/* Quick Restock Product Modal */}
      {restockProduct && (
        <ProductFormModal
          open={isRestockModalOpen}
          onClose={() => setIsRestockModalOpen(false)}
          onSuccess={handleRestockSuccess}
          productToEdit={restockProduct}
        />
      )}
    </Box>
  );
}
