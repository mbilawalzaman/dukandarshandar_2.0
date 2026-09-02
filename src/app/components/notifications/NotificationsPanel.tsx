"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Paper,
  Chip,
  CircularProgress,
  Pagination,
} from "@mui/material";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import Link from "next/link";
import { useNotifications } from "@/app/providers/NotificationProvider";
import { authHeaders } from "@/lib/cart";
import { isChatEnabled } from "@/lib/firebaseConfig";
import type { NotificationType } from "@/types/notifications";

interface ApiNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt?: string | Date | null;
}

function formatWhen(value: unknown) {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }
  return new Date(String(value)).toLocaleString();
}

function notificationRoute(
  n: { entityType?: string | null; entityId?: string | null; type: string },
  variant: "storefront" | "admin"
) {
  if (n.entityType === "conversation" && n.entityId) {
    return variant === "admin"
      ? `/admin/messages?c=${n.entityId}`
      : `/support?c=${n.entityId}`;
  }
  if (n.type.startsWith("order") || n.type.startsWith("payment")) {
    return variant === "admin" ? "/admin/orders" : "/orders";
  }
  return variant === "admin" ? "/admin/notifications" : "/notifications";
}

interface NotificationsPanelProps {
  variant?: "storefront" | "admin";
}

export default function NotificationsPanel({ variant = "storefront" }: NotificationsPanelProps) {
  const { unreadCount: liveUnreadCount } = useNotifications();
  const isAdmin = variant === "admin";

  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const perPage = 15;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(perPage),
      });
      const res = await fetch(`/api/notifications?${params.toString()}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setUnreadCount(data.unreadCount ?? liveUnreadCount);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [page, liveUnreadCount]);

  useEffect(() => {
    if (isChatEnabled()) fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    fetchNotifications();
  };

  const markAll = async () => {
    await fetch("/api/notifications/read-all", { method: "PATCH", headers: authHeaders() });
    fetchNotifications();
  };

  if (!isChatEnabled()) {
    return (
      <Typography color="text.secondary">
        Notifications are not enabled in this environment.
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2 }}>
        <Chip label={`${unreadCount} unread`} color={unreadCount > 0 ? "warning" : "default"} />
        <Button startIcon={<DoneAllIcon />} onClick={markAll} disabled={unreadCount === 0}>
          Mark all read
        </Button>
      </Box>

      <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : notifications.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 4, textAlign: "center" }}>
            No notifications yet.
          </Typography>
        ) : (
          <List disablePadding>
            {notifications.map((n) => (
              <ListItem
                key={n.id}
                divider
                secondaryAction={
                  !n.isRead ? (
                    <IconButton edge="end" onClick={() => markRead(n.id)} aria-label="mark read">
                      <MarkEmailReadIcon />
                    </IconButton>
                  ) : undefined
                }
                component={Link}
                href={notificationRoute(n, variant)}
                sx={{
                  backgroundColor: n.isRead ? "transparent" : "rgba(2, 132, 199, 0.06)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                      <Typography sx={{ fontWeight: n.isRead ? 500 : 700 }}>{n.title}</Typography>
                      {!n.isRead && <Chip label="New" size="small" color="primary" />}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary" component="span" display="block">
                        {n.body}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="span">
                        {formatWhen(n.createdAt)}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, val) => setPage(val)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      {isAdmin && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
          Order and payment alerts link to Admin Orders. Message alerts open Admin Messages.
        </Typography>
      )}
    </Box>
  );
}
