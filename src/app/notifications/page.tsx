"use client";

import React from "react";
import { Box, Container } from "@mui/material";
import PageBanner from "../components/PageBanner";
import NotificationsPanel from "../components/notifications/NotificationsPanel";

export default function NotificationsPage() {
  return (
    <Box>
      <PageBanner title="Notifications" subtitle="Orders, payments, and support updates" />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <NotificationsPanel variant="storefront" />
      </Container>
    </Box>
  );
}
