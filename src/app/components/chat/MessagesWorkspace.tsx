"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  CircularProgress,
  IconButton,
  InputAdornment,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import { authHeaders } from "@/lib/cart";
import { BRAND } from "@/lib/constants";
import { useFirebase } from "@/app/providers/FirebaseProvider";
import SupportChatPanel from "@/app/components/chat/SupportChatPanel";
import { isChatEnabled } from "@/lib/firebaseConfig";
import { useConversationList, type LiveConversation } from "@/hooks/useConversationList";
import {
  getSyncedSelectedConversation,
  setSyncedSelectedConversation,
  subscribeSelectedConversation,
  openChatInNewWindow,
} from "@/lib/chatSync";

interface MessagesWorkspaceProps {
  variant?: "page" | "popup";
  isAdmin?: boolean;
  onClose?: () => void;
  initialSelectedId?: string | null;
}

function conversationPreview(lastMessage?: LiveConversation["lastMessage"]) {
  if (!lastMessage) return "";
  if (typeof lastMessage === "string") return lastMessage;
  if (typeof lastMessage === "object" && "preview" in lastMessage) {
    return String((lastMessage as { preview?: string }).preview || "");
  }
  return "";
}

function customerDisplayName(c: LiveConversation) {
  const name = c.customerName?.trim();
  if (name) return name;
  return "Customer";
}

function conversationSubtitle(c: LiveConversation, isAdmin: boolean) {
  const preview = conversationPreview(c.lastMessage);
  if (!isAdmin) return preview || "Support team";
  return preview || "No messages yet";
}

function formatRelativeTime(value?: unknown) {
  if (!value) return "";
  let d: Date | null = null;
  if (typeof value === "string") {
    d = new Date(value);
  } else if (typeof value === "object" && value !== null) {
    if ("toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
      d = (value as { toDate: () => Date }).toDate();
    } else if ("seconds" in value) {
      d = new Date((value as { seconds: number }).seconds * 1000);
    } else if ("_seconds" in value) {
      d = new Date((value as { _seconds: number })._seconds * 1000);
    }
  }
  if (!d || Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return d.toLocaleDateString();
}

export default function MessagesWorkspace({
  variant = "page",
  isAdmin: isAdminProp,
  onClose,
  initialSelectedId = null,
}: MessagesWorkspaceProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { firebaseUser, ready } = useFirebase();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId || getSyncedSelectedConversation()
  );
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showListOnMobile, setShowListOnMobile] = useState(true);

  const isAdmin = isAdminProp ?? role === "admin";
  const isPopup = variant === "popup";
  const chatEnabled = isChatEnabled();
  const { conversations, loading, error: listError, reload } = useConversationList(userId, isAdmin, ready);
  const error = localError || listError;

  useEffect(() => {
    const syncIdentity = () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          userIdRef.current = null;
          setUserId(null);
          setRole(null);
          setSelectedId(null);
          return;
        }
        const decoded = jwtDecode<{ userId?: string; role?: string }>(token);
        const nextUserId = decoded.userId || null;
        const nextRole = decoded.role || null;
        if (userIdRef.current && nextUserId && userIdRef.current !== nextUserId) {
          setSelectedId(null);
          setSyncedSelectedConversation(null);
        }
        userIdRef.current = nextUserId;
        setUserId(nextUserId);
        setRole(nextRole);
      } catch {
        userIdRef.current = null;
        setUserId(null);
        setRole(null);
        setSelectedId(null);
      }
    };

    syncIdentity();
    window.addEventListener("authChange", syncIdentity);
    window.addEventListener("storage", syncIdentity);
    return () => {
      window.removeEventListener("authChange", syncIdentity);
      window.removeEventListener("storage", syncIdentity);
    };
  }, []);

  useEffect(() => {
    if (initialSelectedId) {
      setSelectedId(initialSelectedId);
      setSyncedSelectedConversation(initialSelectedId);
    }
  }, [initialSelectedId]);

  useEffect(() => subscribeSelectedConversation(setSelectedId), []);

  useEffect(() => {
    if (conversations.length === 1 && !isAdmin && !selectedId) {
      const id = conversations[0]!.id;
      setSelectedId(id);
      setSyncedSelectedConversation(id);
      setShowListOnMobile(false);
    }
  }, [conversations, isAdmin, selectedId]);

  const ensureCustomerConversation = useCallback(async () => {
    if (isAdmin) return;
    setCreating(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to start chat");
      await reload();
      if (data.conversationId) {
        setSelectedId(data.conversationId);
        setSyncedSelectedConversation(data.conversationId);
        setShowListOnMobile(false);
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to start chat");
    } finally {
      setCreating(false);
    }
  }, [isAdmin, reload]);

  useEffect(() => {
    if (!loading && !isAdmin && conversations.length === 0 && userId && chatEnabled && !creating && !error) {
      ensureCustomerConversation();
    }
  }, [loading, isAdmin, conversations.length, userId, chatEnabled, creating, error, ensureCustomerConversation]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = (c.customerName || "").toLowerCase();
      const last = conversationPreview(c.lastMessage).toLowerCase();
      return name.includes(q) || last.includes(q);
    });
  }, [conversations, search]);

  const selected = conversations.find((c) => c.id === selectedId);

  const otherLabel = isAdmin
    ? selected
      ? customerDisplayName(selected)
      : "Customer"
    : "Support";

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setSyncedSelectedConversation(id);
    if (isMobile) setShowListOnMobile(false);
  };

  if (!chatEnabled) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">Chat is not enabled.</Typography>
      </Box>
    );
  }

  if (!ready || (loading && conversations.length === 0)) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: isPopup ? 360 : 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!userId || role === "guest") {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">Please log in to use chat.</Typography>
      </Box>
    );
  }

  const sidebarWidth = isPopup ? (isAdmin ? 200 : 0) : 320;
  const showSidebar = isPopup ? isAdmin && (!isMobile || showListOnMobile) : !isMobile || showListOnMobile;
  const showChat = isPopup ? (!isAdmin || !isMobile || !showListOnMobile) : !isMobile || !showListOnMobile;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: isPopup ? "100%" : "calc(100vh - 120px)",
        minHeight: isPopup ? 420 : 500,
        bgcolor: "background.paper",
        borderRadius: isPopup ? 0 : 2,
        overflow: "hidden",
        border: isPopup ? "none" : 1,
        borderColor: "divider",
      }}
    >
      {isPopup && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2,
            py: 1.75,
            bgcolor: isAdmin ? "#111" : "#ffffff",
            color: isAdmin ? "#fff" : BRAND.navy,
            borderBottom: isAdmin ? "none" : `2px solid ${BRAND.gold}`,
            flexShrink: 0,
          }}
        >
          <Avatar
            sx={{
              width: 38,
              height: 38,
              bgcolor: isAdmin ? "#374151" : BRAND.gold,
              color: isAdmin ? "#fff" : BRAND.navy,
            }}
          >
            <ChatBubbleOutlineIcon sx={{ fontSize: 20 }} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.25} sx={{ fontSize: "0.95rem" }}>
              {isAdmin ? "Messages" : "Support Assistant"}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: isAdmin ? "#9ca3af" : BRAND.muted,
                display: "block",
                lineHeight: 1.3,
              }}
            >
              {isAdmin ? "All customer chats · syncs across windows" : "Dukandar Shandar · we're here to help"}
            </Typography>
          </Box>
          <IconButton
            component={Link}
            href={
              selectedId
                ? `${isAdmin ? "/admin/messages" : "/messages"}?c=${encodeURIComponent(selectedId)}`
                : isAdmin
                  ? "/admin/messages"
                  : "/messages"
            }
            size="small"
            sx={{
              color: isAdmin ? "#fff" : BRAND.navy,
              opacity: 0.85,
              "&:hover": { opacity: 1 },
            }}
            title="Open full screen"
          >
            <OpenInFullIcon sx={{ fontSize: 18 }} />
          </IconButton>
          {onClose && (
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: isAdmin ? "#fff" : BRAND.navy,
                opacity: 0.85,
                "&:hover": { opacity: 1 },
              }}
              title="Minimize"
            >
              <UnfoldLessIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )}
        </Box>
      )}

      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        {showSidebar && (
          <Box
            sx={{
              width: isMobile ? "100%" : sidebarWidth,
              flexShrink: 0,
              borderRight: isMobile ? 0 : 1,
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              bgcolor: "grey.50",
            }}
          >
            {!isPopup && (
              <Box sx={{ px: 2, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h6" fontWeight={700}>
                  Messages
                </Typography>
                {!isAdmin && (
                  <IconButton size="small" onClick={ensureCustomerConversation} disabled={creating} title="New chat">
                    <AddIcon />
                  </IconButton>
                )}
              </Box>
            )}

            <Box sx={{ px: isPopup ? 1.5 : 2, pb: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search chats..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ bgcolor: "background.paper" }}
              />
            </Box>

            {error && (
              <Typography variant="caption" color="error" sx={{ px: 2, pb: 1 }}>
                {error}
              </Typography>
            )}

            <List sx={{ flex: 1, overflow: "auto", py: 0 }}>
              {filtered.length === 0 && !loading && (
                <Box sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    {isAdmin ? "No conversations yet" : "No chat yet"}
                  </Typography>
                  {!isAdmin && (
                    <Typography
                      component="button"
                      variant="body2"
                      onClick={ensureCustomerConversation}
                      disabled={creating}
                      sx={{
                        mt: 1,
                        border: "none",
                        bgcolor: "transparent",
                        color: "primary.main",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Start support chat
                    </Typography>
                  )}
                </Box>
              )}
              {filtered.map((c) => {
                const label = isAdmin ? customerDisplayName(c) : "Support";
                const sub = conversationSubtitle(c, isAdmin);
                const initial = (label[0] || "?").toUpperCase();
                return (
                  <ListItemButton
                    key={c.id}
                    selected={selectedId === c.id}
                    onClick={() => handleSelect(c.id)}
                    sx={{ py: 1.25 }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: "#111", width: 40, height: 40 }}>{initial}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={label}
                      secondary={sub}
                      primaryTypographyProps={{ fontWeight: 600, noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true, fontSize: "0.8rem" }}
                    />
                    {formatRelativeTime(c.updatedAt) ? (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flexShrink: 0 }}>
                        {formatRelativeTime(c.updatedAt)}
                      </Typography>
                    ) : null}
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        )}

        {showChat && (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, bgcolor: "background.paper" }}>
            {!isPopup && (
              <>
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: 1,
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  {isMobile && (
                    <Typography
                      component="button"
                      variant="body2"
                      onClick={() => setShowListOnMobile(true)}
                      sx={{ border: "none", bgcolor: "transparent", cursor: "pointer", mr: 1 }}
                    >
                      ← Back
                    </Typography>
                  )}
                  <ChatBubbleOutlineIcon color="action" />
                  <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                    {selected ? otherLabel : "Select a chat"}
                  </Typography>
                  {selectedId && (
                    <IconButton
                      size="small"
                      title="Open in new window"
                      onClick={() => openChatInNewWindow(selectedId, isAdmin)}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                <Divider />
              </>
            )}

            {selectedId && userId && firebaseUser ? (
              <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <SupportChatPanel
                  conversationId={selectedId}
                  currentUserId={userId}
                  title={isPopup ? undefined : otherLabel}
                  otherPartyLabel={otherLabel}
                  compact={isPopup}
                  widget={isPopup}
                  customerTheme={!isAdmin}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "text.secondary",
                }}
              >
                <Typography>No messages yet</Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
