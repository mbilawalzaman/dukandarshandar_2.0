"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Box, Typography, Chip, Button, MenuItem, Select, FormControl } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AdminDataTable, { ColumnDef } from "../../components/admin/AdminDataTable";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  _id: string;
  customer_name: string;
  customer_email: string;
  items: OrderItem[];
  total_amount: number;
  status: "pending" | "shipped" | "delivered" | "cancelled";
  created_at?: string;
}

interface OrderSummary {
  totalOrders: number;
  statusCounts: Record<string, number>;
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

  const columns: ColumnDef<Order>[] = [
    {
      id: "_id",
      label: "Order ID",
      minWidth: 140,
      format: (val) => String(val).slice(-8).toUpperCase(),
    },
    { id: "customer_name", label: "Customer", minWidth: 140 },
    { id: "customer_email", label: "Email", minWidth: 180 },
    {
      id: "total_amount",
      label: "Total Price",
      minWidth: 120,
      format: (val) => `PKR ${Number(val).toLocaleString()}`,
    },
    {
      id: "status",
      label: "Status",
      minWidth: 150,
      format: (val, row) => (
        <FormControl size="small" variant="outlined" sx={{ minWidth: 120 }}>
          <Select
            value={val || "pending"}
            onChange={(e) => handleStatusChange(row._id as string, e.target.value as string)}
            sx={{ fontSize: "0.85rem", height: 32 }}
          >
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="shipped">Shipped</MenuItem>
            <MenuItem value="delivered">Delivered</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      ),
    },
    {
      id: "created_at",
      label: "Order Date",
      minWidth: 150,
      format: (val) => (val ? new Date(String(val)).toLocaleDateString() : "N/A"),
    },
  ];

  const pendingCount = summary.statusCounts?.pending ?? 0;
  const deliveredCount = summary.statusCounts?.delivered ?? 0;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Order Fulfillment & Revenues
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
            Track customer purchases, update fulfillment statuses, and manage order history.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip label={`Total Orders: ${summary.totalOrders}`} color="primary" variant="outlined" size="small" />
            <Chip label={`Pending: ${pendingCount}`} color="warning" size="small" />
            <Chip label={`Delivered: ${deliveredCount}`} color="success" size="small" />
          </Box>
        </Box>

        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchOrders} sx={{ borderRadius: 2 }}>
          Refresh Orders
        </Button>
      </Box>

      <AdminDataTable
        title="Orders History"
        columns={columns}
        data={orders}
        searchPlaceholder="Search by customer name..."
        loading={loading}
        serverPagination={{
          total,
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
    </Box>
  );
}
