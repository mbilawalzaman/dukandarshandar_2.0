"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider, createTheme, getContrastRatio } from "@mui/material";
import { useStoreSettings } from "./StoreSettingsProvider";
import type { ThemeKey, ThemePreset } from "@/lib/themePresets";
import { getThemePreset, normalizeThemeKey } from "@/lib/themePresets";
import { usePathname } from "next/navigation";

declare module "@mui/material/styles" {
  interface Palette {
    marketplace: {
      header: string;
      footer: string;
      accent: string;
      accentRed: string;
      accentYellow: string;
      accentGreen: string;
      accentBlue: string;
      cardBorder: string;
      highlightBadgeBg: string;
      highlightBadgeText: string;
    };
  }
  interface PaletteOptions {
    marketplace?: {
      header?: string;
      footer?: string;
      accent?: string;
      accentRed?: string;
      accentYellow?: string;
      accentGreen?: string;
      accentBlue?: string;
      cardBorder?: string;
      highlightBadgeBg?: string;
      highlightBadgeText?: string;
    };
  }
}

interface MarketplaceThemeContextType {
  activeThemeKey: ThemeKey;
  savedThemeKey: ThemeKey;
  previewThemeKey: ThemeKey | null;
  setPreviewThemeKey: (key: ThemeKey | null) => void;
  preset: ThemePreset;
}

const MarketplaceThemeContext = createContext<MarketplaceThemeContextType | undefined>(undefined);

export function MarketplaceThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useStoreSettings();
  const [previewThemeKey, setPreviewThemeKey] = useState<ThemeKey | null>(null);
  const pathname = usePathname();
  useEffect(() => { setPreviewThemeKey(null); }, [pathname]);
  useEffect(() => {
    const clear = () => setPreviewThemeKey(null);
    window.addEventListener("authChange", clear);
    return () => window.removeEventListener("authChange", clear);
  }, []);

  const savedThemeKey = useMemo(() => normalizeThemeKey(settings.activeThemeKey), [settings.activeThemeKey]);
  const activeThemeKey = (pathname === "/admin/settings" ? previewThemeKey : null) || savedThemeKey;
  const preset = useMemo(() => getThemePreset(activeThemeKey), [activeThemeKey]);
  const primaryText = getContrastRatio(preset.palette.primary.main, preset.palette.primary.contrastText) >= 4.5
    ? preset.palette.primary.contrastText : "#111111";

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--theme-primary-main", preset.palette.primary.main);
    root.style.setProperty("--theme-text-primary", "#0f172a");
    root.style.setProperty("--theme-text-secondary", "#58575c");
    root.style.setProperty("--theme-header-text", ["amazon", "walmart"].includes(preset.key) ? "#ffffff" : "#0f172a");
    root.style.setProperty("--theme-primary-light", preset.palette.primary.light);
    root.style.setProperty("--theme-primary-dark", preset.palette.primary.dark);
    root.style.setProperty("--theme-primary-contrast", primaryText);
    root.style.setProperty("--theme-secondary-main", preset.palette.secondary.main);
    root.style.setProperty("--theme-secondary-dark", preset.palette.secondary.dark);
    root.style.setProperty("--theme-bg-default", preset.palette.background.default);
    root.style.setProperty("--theme-bg-paper", preset.palette.background.paper);
    root.style.setProperty("--theme-bg-header", preset.palette.background.header);
    root.style.setProperty("--theme-bg-footer", preset.palette.background.footer);
    root.style.setProperty("--theme-card-border", preset.palette.marketplace.cardBorder);
    root.style.setProperty("--theme-card-radius", `${preset.borderRadius.card}px`);
    root.style.setProperty("--theme-button-radius", `${preset.borderRadius.button}px`);
  }, [preset, primaryText]);

  const muiTheme = useMemo(() => {
    return createTheme({
      palette: {
        primary: {
          main: preset.palette.primary.main,
          light: preset.palette.primary.light,
          dark: preset.palette.primary.dark,
          contrastText: primaryText,
        },
        secondary: {
          main: preset.palette.secondary.main,
          light: preset.palette.secondary.light,
          dark: preset.palette.secondary.dark,
          contrastText: preset.palette.secondary.contrastText,
        },
        background: {
          default: preset.palette.background.default,
          paper: preset.palette.background.paper,
        },
        text: {
          primary: "#0f172a",
          secondary: "#64748b",
        },
        marketplace: {
          header: preset.palette.background.header,
          footer: preset.palette.background.footer,
          accent: preset.palette.primary.main,
          accentRed: preset.palette.marketplace.accentRed,
          accentYellow: preset.palette.marketplace.accentYellow,
          accentGreen: preset.palette.marketplace.accentGreen,
          accentBlue: preset.palette.marketplace.accentBlue,
          cardBorder: preset.palette.marketplace.cardBorder,
          highlightBadgeBg: preset.palette.marketplace.highlightBadgeBg,
          highlightBadgeText: preset.palette.marketplace.highlightBadgeText,
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
      shape: { borderRadius: preset.borderRadius.card },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: preset.borderRadius.button,
            },
            containedPrimary: {
              boxShadow: "none",
              backgroundColor: preset.palette.primary.main,
              color: primaryText,
              "&:hover": {
                backgroundColor: preset.palette.primary.dark,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: preset.borderRadius.card,
              borderColor: preset.palette.marketplace.cardBorder,
            },
          },
        },
      },
    });
  }, [preset, primaryText]);

  const value = useMemo(
    () => ({
      activeThemeKey,
      savedThemeKey,
      previewThemeKey,
      setPreviewThemeKey,
      preset,
    }),
    [activeThemeKey, savedThemeKey, previewThemeKey, preset]
  );

  return (
    <MarketplaceThemeContext.Provider value={value}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </MarketplaceThemeContext.Provider>
  );
}

export function useMarketplaceTheme() {
  const context = useContext(MarketplaceThemeContext);
  if (!context) {
    throw new Error("useMarketplaceTheme must be used within a MarketplaceThemeProvider");
  }
  return context;
}
