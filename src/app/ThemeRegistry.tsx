"use client";

import React, { useState, ReactNode } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { CacheProvider } from "@emotion/react";
import createCache, { Options as OptionsOfCreateCache } from "@emotion/cache";
import { BRAND } from "@/lib/constants";
import { CartProvider } from "./providers/CartProvider";
import { FirebaseProvider } from "./providers/FirebaseProvider";
import { NotificationProvider } from "./providers/NotificationProvider";
import { ChatWidgetProvider } from "./providers/ChatWidgetProvider";
import FloatingChatWidget from "./components/chat/FloatingChatWidget";

const theme = createTheme({
  palette: {
    primary: {
      main: BRAND.gold,
      dark: BRAND.goldHover,
      contrastText: "#1a1a1a",
    },
    secondary: {
      main: BRAND.navy,
    },
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
    text: {
      primary: BRAND.navy,
      secondary: BRAND.muted,
    },
  },
  typography: {
    fontFamily: "var(--font-poppins), Poppins, sans-serif",
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          boxShadow: "none",
          "&:hover": { backgroundColor: BRAND.goldHover, boxShadow: "none" },
        },
      },
    },
  },
});

export default function ThemeRegistry({
  children,
  options = { key: "mui", prepend: true },
}: {
  children: ReactNode;
  options?: OptionsOfCreateCache;
}) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache(options);
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) {
      return null;
    }
    let styles = "";
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{
          __html: styles,
        }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <CartProvider>
          <FirebaseProvider>
            <NotificationProvider>
              <ChatWidgetProvider>
                {children}
                <FloatingChatWidget />
              </ChatWidgetProvider>
            </NotificationProvider>
          </FirebaseProvider>
        </CartProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}
