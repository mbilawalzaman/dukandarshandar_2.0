"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Container, Typography, Box } from "@mui/material";
import MessagesWorkspace from "@/app/components/chat/MessagesWorkspace";
import Loader from "@/app/components/loader/Loader";

function MessagesContent() {
  const params = useSearchParams();
  const selectedId = params.get("c");

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Messages
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Open this page in another window or tab messages stay in sync in real time.
      </Typography>
      <Box sx={{ mt: 2 }}>
        <MessagesWorkspace variant="page" initialSelectedId={selectedId} />
      </Box>
    </Container>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<Loader size={180} message="Loading messages..." />}>
      <MessagesContent />
    </Suspense>
  );
}
