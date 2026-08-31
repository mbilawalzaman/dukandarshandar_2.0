"use client";

import React from "react";
import { Grid, Typography, Box, Paper, Chip, CircularProgress } from "@mui/material";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PieChartIcon from "@mui/icons-material/PieChart";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import {
  SalesTrendPoint,
  CategoryDistPoint,
  OrderStatusPoint,
  CATEGORY_COLORS,
  STATUS_COLORS,
} from "@/types/admin";

interface DashboardChartsProps {
  salesTrend?: SalesTrendPoint[];
  categoryDistribution?: CategoryDistPoint[];
  orderStatusBreakdown?: OrderStatusPoint[];
  loading: boolean;
}

export default function DashboardCharts({
  salesTrend = [],
  categoryDistribution = [],
  orderStatusBreakdown = [],
  loading,
}: DashboardChartsProps) {
  return (
    <>
      {/* Row 1: Revenue Trend & Category Distribution */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Sales & Orders Performance Trend */}
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TrendingUpIcon sx={{ color: "#0284c7" }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                  Revenue & Order Volume Trend
                </Typography>
              </Box>
              <Chip label="Last 6 Months" size="small" variant="outlined" />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Monthly fulfilled sales revenue (PKR) and total purchase orders count.
            </Typography>

            <Box sx={{ width: "100%", height: 300, mt: "auto" }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <CircularProgress size={32} />
                </Box>
              ) : salesTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <RechartsTooltip
                      formatter={(val, name) => [
                        name === "revenue" ? `PKR ${Number(val).toLocaleString()}` : val,
                        name === "revenue" ? "Revenue" : "Orders Count",
                      ]}
                      contentStyle={{ backgroundColor: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0" }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue (PKR)"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      name="Orders"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorOrders)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <Typography variant="body2" color="text.secondary">
                    No orders placed in this timeline yet.
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Category Products Distribution (Donut Chart) */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <PieChartIcon sx={{ color: "#8b5cf6" }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                Category Breakdown
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Catalog product distribution across stationery categories.
            </Typography>

            <Box sx={{ width: "100%", height: 300, mt: "auto" }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <CircularProgress size={32} />
                </Box>
              ) : categoryDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {categoryDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val) => [`${val} products`, "Count"]}
                      contentStyle={{ backgroundColor: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0" }}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <Typography variant="body2" color="text.secondary">
                    No products added yet.
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Row 2: Order Fulfillment Bar Chart */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <DonutLargeIcon sx={{ color: "#10b981" }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                Order Fulfillment Status
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Real-time distribution of pending, shipped, delivered, and cancelled orders.
            </Typography>

            <Box sx={{ width: "100%", height: 240, mt: "auto" }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <CircularProgress size={32} />
                </Box>
              ) : orderStatusBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orderStatusBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="status" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                    <RechartsTooltip
                      formatter={(val, _, item) => [
                        `${val} orders (PKR ${Number(item.payload.value || 0).toLocaleString()})`,
                        "Orders",
                      ]}
                      contentStyle={{ backgroundColor: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0" }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {orderStatusBreakdown.map((entry, index) => (
                        <Cell key={`status-cell-${index}`} fill={STATUS_COLORS[entry.status.toLowerCase()] || "#0284c7"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <Typography variant="body2" color="text.secondary">
                    No orders placed yet.
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
