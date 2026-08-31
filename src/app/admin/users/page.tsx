"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, Chip } from "@mui/material";
import AdminDataTable, { ColumnDef } from "../../components/admin/AdminDataTable";

interface User {
  _id: string;
  name: string;
  email: string;
  role?: string;
  created_at?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch("/api/users", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const columns: ColumnDef<User>[] = [
    { id: "name", label: "User Name", minWidth: 160 },
    { id: "email", label: "Email Address", minWidth: 200 },
    {
      id: "role",
      label: "Account Role",
      minWidth: 120,
      format: (val) => (
        <Chip
          label={String(val || "Customer")}
          size="small"
          color={String(val).toLowerCase() === "admin" ? "secondary" : "default"}
        />
      ),
    },
    {
      id: "created_at",
      label: "Joined Date",
      minWidth: 160,
      format: (val) => (val ? new Date(String(val)).toLocaleDateString() : "N/A"),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
          Registered Accounts Directory
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor user registrations, account emails, and assigned permissions.
        </Typography>
      </Box>

      <AdminDataTable
        title="Users List"
        columns={columns}
        data={users}
        searchField="name"
        searchPlaceholder="Search by user name or email..."
        loading={loading}
      />
    </Box>
  );
}
