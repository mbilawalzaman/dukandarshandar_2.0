"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  CircularProgress,
  Chip,
  Button,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebaseClient";
import { useFirebase } from "@/app/providers/FirebaseProvider";
import { authHeaders } from "@/lib/cart";
import { BRAND } from "@/lib/constants";

const PAGE_SIZE = 30;

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  clientMessageId?: string;
  createdAt?: { toDate?: () => Date } | Date | string | null;
  pending?: boolean;
  failed?: boolean;
}

interface SupportChatPanelProps {
  conversationId: string;
  currentUserId: string;
  title?: string;
  otherPartyLabel?: string;
  compact?: boolean;
  widget?: boolean;
  customerTheme?: boolean;
}

function toDate(value: ChatMessage["createdAt"]) {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  return new Date(String(value));
}

function formatTime(value: ChatMessage["createdAt"]) {
  const date = toDate(value);
  return date ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
}

function formatDay(value: ChatMessage["createdAt"]) {
  const date = toDate(value);
  if (!date) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function mapDoc(doc: QueryDocumentSnapshot<DocumentData>): ChatMessage {
  return { id: doc.id, ...(doc.data() as Omit<ChatMessage, "id">) };
}

function sameDay(a: ChatMessage["createdAt"], b: ChatMessage["createdAt"]) {
  const da = toDate(a);
  const db = toDate(b);
  if (!da || !db) return false;
  return da.toDateString() === db.toDateString();
}

export default function SupportChatPanel({
  conversationId,
  currentUserId,
  title,
  otherPartyLabel = "Support",
  compact = false,
  widget = false,
  customerTheme = false,
}: SupportChatPanelProps) {
  const { firebaseUser, ready } = useFirebase();
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [olderMessages, setOlderMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<Map<string, ChatMessage>>(new Map());
  const oldestCursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const paginationInitializedRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const initialScrollDoneRef = useRef(false);

  const allMessages = useMemo(() => {
    const merged = new Map<string, ChatMessage>();
    [...olderMessages, ...liveMessages].forEach((m) => merged.set(m.id, m));
    pendingRef.current.forEach((m) => merged.set(m.id, m));
    return Array.from(merged.values()).sort((a, b) => {
      const ta = toDate(a.createdAt)?.getTime() || 0;
      const tb = toDate(b.createdAt)?.getTime() || 0;
      return ta - tb;
    });
  }, [olderMessages, liveMessages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (!conversationId || !firebaseUser || !ready) return;

    setOlderMessages([]);
    setLiveMessages([]);
    setHasMoreOlder(true);
    oldestCursorRef.current = null;
    paginationInitializedRef.current = false;
    initialScrollDoneRef.current = false;
    shouldStickToBottomRef.current = true;
    pendingRef.current.clear();

    fetch(`/api/conversations/${conversationId}/read`, {
      method: "PATCH",
      headers: authHeaders(),
    }).catch(() => undefined);

    const messagesCol = collection(getFirebaseDb(), "conversations", conversationId, "messages");
    const liveQuery = query(messagesCol, orderBy("createdAt", "desc"), limit(PAGE_SIZE));

    const unsub = onSnapshot(liveQuery, (snap) => {
      const serverMessages = snap.docs.map(mapDoc).reverse();

      if (!paginationInitializedRef.current && snap.docs.length > 0) {
        oldestCursorRef.current = snap.docs[snap.docs.length - 1]!;
        paginationInitializedRef.current = true;
        if (snap.docs.length < PAGE_SIZE) {
          setHasMoreOlder(false);
        }
      }

      const serverClientIds = new Set(serverMessages.map((m) => m.clientMessageId).filter(Boolean));
      pendingRef.current.forEach((pending, key) => {
        if (serverClientIds.has(key)) pendingRef.current.delete(key);
      });

      setLiveMessages(serverMessages);
      setLoading(false);

      if (!initialScrollDoneRef.current) {
        initialScrollDoneRef.current = true;
        requestAnimationFrame(() => scrollToBottom("auto"));
      } else if (shouldStickToBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom("smooth"));
      }
    });

    return () => unsub();
  }, [conversationId, firebaseUser, ready, scrollToBottom]);

  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMoreOlder || !oldestCursorRef.current) return;

    const container = scrollRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    const prevScrollTop = container?.scrollTop || 0;

    setLoadingOlder(true);
    try {
      const messagesCol = collection(getFirebaseDb(), "conversations", conversationId, "messages");
      const olderQuery = query(
        messagesCol,
        orderBy("createdAt", "desc"),
        startAfter(oldestCursorRef.current),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(olderQuery);
      if (snap.empty) {
        setHasMoreOlder(false);
        return;
      }

      oldestCursorRef.current = snap.docs[snap.docs.length - 1] || oldestCursorRef.current;
      if (snap.docs.length < PAGE_SIZE) {
        setHasMoreOlder(false);
      }

      const fetched = snap.docs.map(mapDoc).reverse();
      setOlderMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const unique = fetched.filter((m) => !ids.has(m.id));
        return [...unique, ...prev];
      });

      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
        }
      });
    } catch (err) {
      console.error("Load older messages error:", err);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, hasMoreOlder, loadingOlder]);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;

    if (container.scrollTop <= 48 && hasMoreOlder && !loadingOlder) {
      loadOlderMessages();
    }
  }, [hasMoreOlder, loadOlderMessages, loadingOlder]);

  const sendMessage = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const clientMessageId = crypto.randomUUID();
    const optimistic: ChatMessage = {
      id: `pending-${clientMessageId}`,
      senderId: currentUserId,
      text: trimmed,
      clientMessageId,
      pending: true,
      createdAt: new Date(),
    };
    pendingRef.current.set(clientMessageId, optimistic);
    setLiveMessages((prev) => [...prev, optimistic]);
    setText("");
    setSending(true);
    shouldStickToBottomRef.current = true;

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ text: trimmed, clientMessageId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        pendingRef.current.delete(clientMessageId);
        setLiveMessages((prev) =>
          prev.map((m) =>
            m.clientMessageId === clientMessageId ? { ...m, pending: false, failed: true } : m
          )
        );
      }
    } catch {
      pendingRef.current.delete(clientMessageId);
      setLiveMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId ? { ...m, pending: false, failed: true } : m
        )
      );
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollToBottom("smooth"));
    }
  }, [conversationId, currentUserId, scrollToBottom, sending, text]);

  return (
    <Paper
      elevation={0}
      sx={{
        border: widget ? "none" : "1px solid #e2e8f0",
        borderRadius: widget ? 0 : 3,
        display: "flex",
        flexDirection: "column",
        height: compact || widget ? "100%" : 560,
        minHeight: compact || widget ? 0 : 560,
        bgcolor: widget ? "transparent" : "background.paper",
      }}
    >
      {!widget && (
        <Box sx={{ p: 2, borderBottom: "1px solid #e2e8f0" }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title || "Support Chat"}
          </Typography>
        </Box>
      )}

      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflowY: "auto",
          p: widget ? 2 : 2,
          backgroundColor: widget || customerTheme ? (customerTheme ? "#ffffff" : "#f3f4f6") : "#f8fafc",
          minHeight: 0,
        }}
      >
        {allMessages.length > 0 && (loadingOlder || hasMoreOlder) && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 1, mb: 1 }}>
            {loadingOlder ? (
              <CircularProgress size={20} />
            ) : (
              <Button
                size="small"
                variant="text"
                onClick={loadOlderMessages}
                sx={{ color: customerTheme ? BRAND.goldDark : "#b8860b", fontWeight: 600 }}
              >
                Load older messages
              </Button>
            )}
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : allMessages.length === 0 ? (
          widget ? (
            <Box sx={{ display: "flex", alignItems: "flex-start", pt: 1 }}>
              <Box
                sx={{
                  maxWidth: "92%",
                  px: 2,
                  py: 1.75,
                  borderRadius: 2.5,
                  bgcolor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}
              >
                <Typography variant="body2" sx={{ color: "#374151", lineHeight: 1.6 }}>
                  Hello! I am your Dukandar Shandar Support Assistant. How can I help you today?
                </Typography>
              </Box>
            </Box>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              Start the conversation, we typically reply within a few hours.
            </Typography>
          )
        ) : (
          <List disablePadding>
            {allMessages.map((msg, index) => {
              const mine = msg.senderId === currentUserId;
              const prev = index > 0 ? allMessages[index - 1] : null;
              const showDay = !prev || !sameDay(msg.createdAt, prev.createdAt);

              return (
                <React.Fragment key={msg.id}>
                  {showDay && (
                    <Box sx={{ display: "flex", justifyContent: "center", my: 1.5 }}>
                      <Chip label={formatDay(msg.createdAt)} size="small" variant="outlined" />
                    </Box>
                  )}
                  <ListItem disableGutters sx={{ flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", mb: 1 }}>
                    {!mine && !widget && (
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25, ml: 0.5 }}>
                        {otherPartyLabel}
                      </Typography>
                    )}
                    <Box
                      sx={{
                        maxWidth: widget ? "88%" : "78%",
                        px: widget ? 2 : 1.5,
                        py: widget ? 1.25 : 1,
                        borderRadius: widget ? 2.5 : mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        backgroundColor: mine
                          ? customerTheme
                            ? BRAND.gold
                            : widget
                              ? "#374151"
                              : "#0284c7"
                          : "#ffffff",
                        color: mine ? (customerTheme ? BRAND.navy : "#fff") : "#374151",
                        border: mine ? "none" : "1px solid #e5e7eb",
                        boxShadow: mine ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {msg.text}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5, opacity: 0.85, justifyContent: "flex-end" }}>
                        <Typography variant="caption">{formatTime(msg.createdAt)}</Typography>
                        {msg.pending && (
                          <Chip label="Sending..." size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
                        )}
                        {msg.failed && (
                          <Chip label="Failed" color="error" size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
                        )}
                      </Box>
                    </Box>
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        )}
        <div ref={bottomRef} />
      </Box>

      <Box
        sx={{
          px: widget ? 2 : 2,
          py: widget ? 1.5 : 2,
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          gap: 1,
          alignItems: "center",
          bgcolor: widget || customerTheme ? "#ffffff" : "background.paper",
          flexShrink: 0,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder={widget ? "Type your question..." : "Type a message..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          multiline={!widget}
          maxRows={widget ? 1 : 4}
          sx={{
            flex: 1,
            minWidth: 0,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              bgcolor: "#fff",
              fontSize: "0.875rem",
            },
          }}
        />
        <IconButton
          onClick={sendMessage}
          disabled={sending || !text.trim()}
          sx={{
            flexShrink: 0,
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: text.trim()
              ? customerTheme
                ? BRAND.gold
                : "#6b7280"
              : "#e5e7eb",
            color: text.trim() ? (customerTheme ? BRAND.navy : "#fff") : "#9ca3af",
            "&:hover": {
              bgcolor: text.trim()
                ? customerTheme
                  ? BRAND.goldHover
                  : "#4b5563"
                : "#e5e7eb",
            },
            "&.Mui-disabled": { bgcolor: "#e5e7eb", color: "#9ca3af" },
          }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
}
