"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import NotificationsPanel from "@/app/components/notifications/NotificationsPanel";

export default function AdminNotificationsPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Notifications
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        All alerts for orders, payments, stock, and customer messages.
      </Typography>
      <NotificationsPanel variant="admin" />
    </Box>
  );
}
