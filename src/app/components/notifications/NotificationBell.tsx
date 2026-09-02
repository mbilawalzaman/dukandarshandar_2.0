"use client";

import React, { useEffect, useState } from "react";
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/app/providers/NotificationProvider";
import { authHeaders } from "@/lib/cart";
import { isChatEnabled } from "@/lib/firebaseConfig";
import {
  registerWebPushToken,
  unregisterWebPushToken,
  isWebPushEnabled,
  isWebPushSupported,
} from "@/lib/fcmClient";

export default function NotificationBell() {
  const { unreadCount, notifications } = useNotifications();
  const pathname = usePathname();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  const viewAllHref = pathname.startsWith("/admin") ? "/admin/notifications" : "/notifications";

  useEffect(() => {
    setPushSupported(isWebPushSupported());
    setPushEnabled(isWebPushEnabled());
  }, [anchor]);

  if (!isChatEnabled()) return null;

  const latest = notifications.slice(0, 5);
  const pushBlocked =
    pushSupported && typeof window !== "undefined" && Notification.permission === "denied";

  return (
    <>
      <IconButton color="inherit" onClick={(e) => setAnchor(e.currentTarget)} aria-label="notifications">
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <Box sx={{ px: 2, py: 1, minWidth: 280 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Notifications
          </Typography>
        </Box>
        <Divider />
        {latest.length === 0 ? (
          <MenuItem disabled>No notifications</MenuItem>
        ) : (
          latest.map((n) => (
            <MenuItem
              key={n.id}
              component={Link}
              href={viewAllHref}
              onClick={async () => {
                await fetch(`/api/notifications/${n.id}/read`, {
                  method: "PATCH",
                  headers: { ...authHeaders(), "Content-Type": "application/json" },
                  body: JSON.stringify({}),
                });
                setAnchor(null);
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: n.isRead ? 400 : 700 }}>
                  {n.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {n.body}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
        <Divider />
        <Box sx={{ px: 1.5, py: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          {pushSupported && (
            <>
              {pushEnabled ? (
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  color="inherit"
                  onClick={async () => {
                    await unregisterWebPushToken();
                    setPushEnabled(false);
                    setAnchor(null);
                  }}
                >
                  Disable browser push
                </Button>
              ) : (
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  disabled={pushBlocked}
                  onClick={async () => {
                    const ok = await registerWebPushToken();
                    setPushEnabled(ok);
                    setAnchor(null);
                  }}
                >
                  Enable browser push
                </Button>
              )}
              {pushBlocked && (
                <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                  Notifications are blocked in your browser settings.
                </Typography>
              )}
            </>
          )}
          <Button
            size="small"
            variant="text"
            fullWidth
            onClick={async () => {
              await fetch("/api/notifications/read-all", { method: "PATCH", headers: authHeaders() });
              setAnchor(null);
            }}
          >
            Mark all read
          </Button>
        </Box>
        <MenuItem component={Link} href={viewAllHref} onClick={() => setAnchor(null)}>
          View all
        </MenuItem>
      </Menu>
    </>
  );
}
