"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getSyncedWidgetOpen,
  setSyncedWidgetOpen,
  subscribeWidgetOpen,
} from "@/lib/chatSync";

type ChatWidgetContextValue = {
  isOpen: boolean;
  openWidget: () => void;
  closeWidget: () => void;
  toggleWidget: () => void;
};

const ChatWidgetContext = createContext<ChatWidgetContextValue | null>(null);

export function ChatWidgetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(getSyncedWidgetOpen());
    return subscribeWidgetOpen(setIsOpen);
  }, []);

  const openWidget = useCallback(() => {
    setIsOpen(true);
    setSyncedWidgetOpen(true);
  }, []);

  const closeWidget = useCallback(() => {
    setIsOpen(false);
    setSyncedWidgetOpen(false);
  }, []);

  const toggleWidget = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      setSyncedWidgetOpen(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ isOpen, openWidget, closeWidget, toggleWidget }),
    [isOpen, openWidget, closeWidget, toggleWidget]
  );

  return <ChatWidgetContext.Provider value={value}>{children}</ChatWidgetContext.Provider>;
}

export function useChatWidget() {
  const ctx = useContext(ChatWidgetContext);
  if (!ctx) throw new Error("useChatWidget must be used within ChatWidgetProvider");
  return ctx;
}
