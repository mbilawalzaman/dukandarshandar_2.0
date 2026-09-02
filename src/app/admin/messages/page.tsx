"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Typography, Box, CircularProgress } from "@mui/material";
import MessagesWorkspace from "@/app/components/chat/MessagesWorkspace";

function AdminMessagesContent() {
  const params = useSearchParams();
  const selectedId = params.get("c");

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Messages
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Conversations sync live across tabs and windows — select a chat in one window and it updates everywhere.
      </Typography>
      <Box sx={{ mt: 2 }}>
        <MessagesWorkspace variant="page" isAdmin initialSelectedId={selectedId} />
      </Box>
    </Box>
  );
}

export default function AdminMessagesPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      }
    >
      <AdminMessagesContent />
    </Suspense>
  );
}
