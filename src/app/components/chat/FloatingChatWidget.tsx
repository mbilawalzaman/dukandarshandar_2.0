"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Fab, Paper, Slide, useMediaQuery, useTheme } from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { usePathname } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { useChatWidget } from "@/app/providers/ChatWidgetProvider";
import { useFirebase } from "@/app/providers/FirebaseProvider";
import { isChatEnabled } from "@/lib/firebaseConfig";
import MessagesWorkspace from "@/app/components/chat/MessagesWorkspace";
import { BRAND } from "@/lib/constants";

const STORAGE_KEY = "floating-chat-position";
const FAB_SIZE = 56;
const DRAG_THRESHOLD = 6;
const POPUP_WIDTH = 380;
const POPUP_HEIGHT = 520;

type Position = { x: number; y: number };

function loadPosition(): Position | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Position;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function defaultPosition(): Position {
  if (typeof window === "undefined") return { x: 24, y: 24 };
  return {
    x: Math.max(16, window.innerWidth - FAB_SIZE - 24),
    y: Math.max(16, window.innerHeight - FAB_SIZE - 24),
  };
}

function clampPosition(pos: Position): Position {
  if (typeof window === "undefined") return pos;
  const maxX = window.innerWidth - FAB_SIZE - 8;
  const maxY = window.innerHeight - FAB_SIZE - 8;
  return {
    x: Math.min(Math.max(8, pos.x), maxX),
    y: Math.min(Math.max(8, pos.y), maxY),
  };
}

export default function FloatingChatWidget() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const pathname = usePathname();
  const { firebaseUser, ready } = useFirebase();
  const { isOpen, toggleWidget, closeWidget } = useChatWidget();
  const [position, setPosition] = useState<Position>(defaultPosition);
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const positionRef = useRef(position);

  const dragRef = useRef({
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const syncRoleFromToken = useCallback(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setRole(null);
        setUserId(null);
        return;
      }
      const decoded = jwtDecode<{ role?: string; userId?: string }>(token);
      setRole(decoded.role || null);
      setUserId(decoded.userId || null);
    } catch {
      setRole(null);
      setUserId(null);
    }
  }, []);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    const saved = loadPosition();
    const initial = clampPosition(saved ?? defaultPosition());
    setPosition(initial);
    positionRef.current = initial;
    setMounted(true);
    syncRoleFromToken();
  }, [syncRoleFromToken]);

  useEffect(() => {
    const onAuthChange = () => syncRoleFromToken();
    window.addEventListener("authChange", onAuthChange);
    window.addEventListener("storage", onAuthChange);
    return () => {
      window.removeEventListener("authChange", onAuthChange);
      window.removeEventListener("storage", onAuthChange);
    };
  }, [syncRoleFromToken]);

  useEffect(() => {
    const onResize = () => setPosition((p) => clampPosition(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const persistPosition = useCallback((pos: Position) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      dragging: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: positionRef.current.x,
      originY: positionRef.current.y,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!dragRef.current.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    dragRef.current.moved = true;
    const next = clampPosition({
      x: dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
    });
    positionRef.current = next;
    setPosition(next);
  };

  const onPointerUp = () => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    if (dragRef.current.moved) {
      persistPosition(positionRef.current);
    } else {
      toggleWidget();
    }
    dragRef.current.moved = false;
  };

  if (!isChatEnabled() || !ready || !firebaseUser || !mounted || role === "guest") {
    return null;
  }

  const hideOnMessagesPage =
    pathname === "/messages" ||
    pathname === "/admin/messages" ||
    pathname === "/support" ||
    pathname === "/admin/support";

  if (hideOnMessagesPage) return null;

  const isAdmin = role === "admin";
  const popupWidth = isMobile ? "calc(100vw - 24px)" : POPUP_WIDTH;
  const popupHeight = isMobile ? "calc(100vh - 100px)" : POPUP_HEIGHT;

  const popupRight = isMobile ? 12 : Math.max(12, window.innerWidth - position.x - FAB_SIZE);
  const popupBottom = isMobile ? 80 : window.innerHeight - position.y + FAB_SIZE + 16;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1400,
      }}
    >
      <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
        <Paper
          elevation={12}
          sx={{
            position: "fixed",
            zIndex: 1400,
            width: popupWidth,
            height: popupHeight,
            maxHeight: "85vh",
            right: isMobile ? 12 : popupRight,
            bottom: popupBottom,
            borderRadius: 3,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            pointerEvents: "auto",
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <MessagesWorkspace
            key={userId || "anonymous"}
            variant="popup"
            isAdmin={isAdmin}
            onClose={closeWidget}
          />
        </Paper>
      </Slide>

      <Fab
        aria-label="Open chat"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        sx={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 1401,
          bgcolor: isAdmin ? "#111" : BRAND.gold,
          color: isAdmin ? "#fff" : BRAND.navy,
          width: FAB_SIZE,
          height: FAB_SIZE,
          touchAction: "none",
          cursor: "grab",
          pointerEvents: "auto",
          boxShadow: isAdmin ? "0 6px 20px rgba(0,0,0,0.25)" : "0 6px 20px rgba(254,190,76,0.45)",
          "&:hover": { bgcolor: isAdmin ? "#222" : BRAND.goldHover },
          "&:active": { cursor: "grabbing" },
        }}
      >
        <ChatBubbleOutlineIcon />
      </Fab>
    </Box>
  );
}
