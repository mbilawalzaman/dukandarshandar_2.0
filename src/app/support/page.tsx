"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Container, Typography, CircularProgress, Alert } from "@mui/material";
import { jwtDecode } from "jwt-decode";
import PageBanner from "../components/PageBanner";
import SupportChatPanel from "../components/chat/SupportChatPanel";
import { authHeaders } from "@/lib/cart";
import { isChatEnabled } from "@/lib/firebaseConfig";
import { useFirebase } from "../providers/FirebaseProvider";

function SupportContent() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const presetConversation = params.get("c");
  const { firebaseUser, ready, error: firebaseError } = useFirebase();

  const [conversationId, setConversationId] = useState<string | null>(presetConversation);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/support");
      return;
    }
    try {
      const decoded = jwtDecode<{ userId?: string; role?: string }>(token);
      if (decoded.role === "guest") {
        router.replace("/login?next=/support");
        return;
      }
      setUserId(decoded.userId || null);
    } catch {
      router.replace("/login?next=/support");
    }
  }, [router]);

  useEffect(() => {
    if (!userId || !isChatEnabled()) {
      setLoading(false);
      return;
    }
    if (presetConversation) {
      setConversationId(presetConversation);
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (data.success) {
          setConversationId(data.conversationId);
        } else {
          setError(data.message || "Could not start support chat");
        }
      } catch {
        setError("Failed to connect to support");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [userId, orderId, presetConversation]);

  if (!isChatEnabled()) {
    return (
      <Box>
        <PageBanner title="Support" subtitle="Chat with our team" />
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Alert severity="info">Support chat is not enabled in this environment.</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <PageBanner title="Support" subtitle="Chat with Dukandar Shandar order help and questions" />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Send a message to our support team for order help, product questions, or account issues.
        </Typography>
        {firebaseError && <Alert severity="warning" sx={{ mb: 2 }}>{firebaseError}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading || !ready || !firebaseUser || !conversationId || !userId ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 2 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Connecting to support chat…
            </Typography>
          </Box>
        ) : (
          <SupportChatPanel
            conversationId={conversationId}
            currentUserId={userId}
            title="Customer Support"
            otherPartyLabel="Support Team"
            customerTheme
          />
        )}
      </Container>
    </Box>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={null}>
      <SupportContent />
    </Suspense>
  );
}
