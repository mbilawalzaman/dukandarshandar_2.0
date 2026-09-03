"use client";

import React from "react";
import { Grid } from "@mui/material";
import StatCard from "./StatCard";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import PeopleIcon from "@mui/icons-material/People";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PaidIcon from "@mui/icons-material/Paid";
import type { AdminDashboardStats } from "@/types/apps/adminDashboardTypes";

interface DashboardMetricsGridProps {
  stats: AdminDashboardStats;
  loading: boolean;
}

export default function DashboardMetricsGrid({ stats, loading }: DashboardMetricsGridProps) {
  return (
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
          title="Delivered Revenue"
          value={loading ? "..." : `PKR ${stats.totalEarnings.toLocaleString()}`}
          icon={<PaidIcon />}
          color="#10b981"
          subtitle="Fulfilled sales earnings"
        />
      </Grid>
    </Grid>
  );
}
