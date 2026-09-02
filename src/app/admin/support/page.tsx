"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Typography,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import { jwtDecode } from "jwt-decode";
import SupportChatPanel from "@/app/components/chat/SupportChatPanel";
import { isChatEnabled } from "@/lib/firebaseConfig";
import { useFirebase } from "@/app/providers/FirebaseProvider";
import { useConversationList } from "@/hooks/useConversationList";
import {
  getSyncedSelectedConversation,
  setSyncedSelectedConversation,
  subscribeSelectedConversation,
} from "@/lib/chatSync";

function AdminSupportContent() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("c");
  const { firebaseUser, ready } = useFirebase();

  const [userId, setUserId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(selectedId || getSyncedSelectedConversation());
  const { conversations, loading, error: listError } = useConversationList(userId, true, ready);

  const error = listError?.includes("index")
    ? `${listError} — open the Firestore index link in your terminal/server logs, click Create Index, wait 2–5 min, then refresh.`
    : listError;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?next=/admin/support");
      return;
    }
    try {
      const decoded = jwtDecode<{ userId?: string; role?: string }>(token);
      if (decoded.role !== "admin") {
        router.replace("/");
        return;
      }
      setUserId(decoded.userId || null);
    } catch {
      router.replace("/login?next=/admin/support");
    }
  }, [router]);

  useEffect(() => subscribeSelectedConversation(setActiveId), []);

  useEffect(() => {
    if (selectedId) {
      setActiveId(selectedId);
      setSyncedSelectedConversation(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!activeId && conversations[0]?.id) {
      const id = conversations[0].id;
      setActiveId(id);
      setSyncedSelectedConversation(id);
    }
  }, [activeId, conversations]);

  if (!isChatEnabled()) {
    return <Alert severity="info">Support chat is not enabled in this environment.</Alert>;
  }

  if (loading || !ready || !firebaseUser) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
        Support Inbox
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Customer support conversations sync live across tabs and windows.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, maxHeight: 560, overflow: "auto" }}>
            <List disablePadding>
              {conversations.length === 0 ? (
                <ListItemText primary="No conversations yet" sx={{ p: 2 }} />
              ) : (
                conversations.map((c) => {
                  const preview =
                    typeof c.lastMessage === "object" && c.lastMessage && "preview" in c.lastMessage
                      ? String((c.lastMessage as { preview?: string }).preview || "")
                      : typeof c.lastMessage === "string"
                        ? c.lastMessage
                        : "No messages yet";
                  const label = c.customerName?.trim() || "Customer";
                  return (
                    <ListItemButton
                      key={c.id}
                      selected={activeId === c.id}
                      onClick={() => {
                        setActiveId(c.id);
                        setSyncedSelectedConversation(c.id);
                      }}
                    >
                      <ListItemText primary={label} secondary={preview} />
                      {(c.unreadCount || 0) > 0 && (
                        <Chip label={c.unreadCount} size="small" color="primary" />
                      )}
                    </ListItemButton>
                  );
                })
              )}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          {activeId && userId ? (
            <SupportChatPanel
              conversationId={activeId}
              currentUserId={userId}
              title={`Conversation ${activeId.slice(-8).toUpperCase()}`}
              otherPartyLabel="Customer"
            />
          ) : (
            <Paper sx={{ p: 4, textAlign: "center", border: "1px solid #e2e8f0" }}>
              <Typography color="text.secondary">Select a conversation</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default function AdminSupportPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <AdminSupportContent />
    </Suspense>
  );
}
