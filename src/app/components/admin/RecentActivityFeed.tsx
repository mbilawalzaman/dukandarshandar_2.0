"use client";

import React from "react";
import {
  Grid,
  Typography,
  Box,
  Paper,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from "@mui/material";
import Link from "next/link";
import { RecentOrder, RecentUser } from "@/types/admin";

interface RecentActivityFeedProps {
  recentOrders?: RecentOrder[];
  recentUsers?: RecentUser[];
}

export default function RecentActivityFeed({
  recentOrders = [],
  recentUsers = [],
}: RecentActivityFeedProps) {
  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {/* Recent Orders Table */}
      <Grid item xs={12} md={7}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0", height: "100%" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              Recent Customer Orders
            </Typography>
            <Button component={Link} href="/admin/orders" size="small" variant="text">
              View All Orders →
            </Button>
          </Box>

          <TableContainer sx={{ border: "1px solid #f1f5f9", borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Order ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentOrders.length > 0 ? (
                  recentOrders.map((ord) => (
                    <TableRow key={ord._id} hover>
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
                        #{String(ord._id).slice(-6).toUpperCase()}
                      </TableCell>
                      <TableCell>{ord.customer_name || "Guest"}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>PKR {Number(ord.total_amount).toLocaleString()}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={ord.status}
                          size="small"
                          color={
                            ord.status === "delivered"
                              ? "success"
                              : ord.status === "pending"
                              ? "warning"
                              : ord.status === "shipped"
                              ? "primary"
                              : "error"
                          }
                          sx={{ textTransform: "capitalize", fontSize: "0.75rem" }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>
                      No orders recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      {/* Recent Registered Users */}
      <Grid item xs={12} md={5}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0", height: "100%" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              New Customers
            </Typography>
            <Button component={Link} href="/admin/users" size="small" variant="text">
              Users Directory →
            </Button>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {recentUsers.length > 0 ? (
              recentUsers.map((user) => (
                <Box
                  key={user._id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: "#0284c7", width: 34, height: 34, fontSize: "0.85rem", fontWeight: 700 }}>
                      {(user.userName || user.email || "U").charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {user.userName || "Customer"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={user.role || "user"}
                    size="small"
                    variant="outlined"
                    color={user.role === "admin" ? "primary" : "default"}
                    sx={{ textTransform: "capitalize", fontSize: "0.75rem" }}
                  />
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
                No customer accounts registered yet.
              </Typography>
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}
