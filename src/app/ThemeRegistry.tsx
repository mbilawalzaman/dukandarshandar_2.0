"use client";

import type { ReactNode } from "react";
import React, { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { CacheProvider } from "@emotion/react";
import type { Options as OptionsOfCreateCache } from "@emotion/cache";
import createCache from "@emotion/cache";
import { CartProvider } from "./providers/CartProvider";
import { PromotionProvider } from "./providers/PromotionProvider";
import { FirebaseProvider } from "./providers/FirebaseProvider";
import { NotificationProvider } from "./providers/NotificationProvider";
import { ChatWidgetProvider } from "./providers/ChatWidgetProvider";
import FloatingChatWidget from "./components/chat/FloatingChatWidget";
import FloatingWhatsAppWidget from "./components/chat/FloatingWhatsAppWidget";
import { StoreSettingsProvider } from "./providers/StoreSettingsProvider";
import { MarketplaceThemeProvider } from "./providers/MarketplaceThemeProvider";

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
      <StoreSettingsProvider>
        <MarketplaceThemeProvider>
          <CartProvider>
            <PromotionProvider>
              <FirebaseProvider>
                <NotificationProvider>
                  <ChatWidgetProvider>
                    {children}
                    <FloatingWhatsAppWidget />
                    <FloatingChatWidget />
                  </ChatWidgetProvider>
                </NotificationProvider>
              </FirebaseProvider>
            </PromotionProvider>
          </CartProvider>
        </MarketplaceThemeProvider>
      </StoreSettingsProvider>
    </CacheProvider>
  );
}
