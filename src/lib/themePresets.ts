export const THEME_KEYS = [
  "default",
  "daraz",
  "amazon",
  "ebay",
  "walmart",
  "aliexpress",
  "temu",
] as const;

export type ThemeKey = (typeof THEME_KEYS)[number];

export interface ThemePreset {
  key: ThemeKey;
  name: string;
  subtitle: string;
  badgeTag: string;
  palette: {
    primary: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    secondary: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    background: {
      default: string;
      paper: string;
      header: string;
      footer: string;
    };
    marketplace: {
      accentRed: string;
      accentYellow: string;
      accentGreen: string;
      accentBlue: string;
      cardBorder: string;
      highlightBadgeBg: string;
      highlightBadgeText: string;
    };
  };
  borderRadius: {
    card: number;
    button: number;
  };
}

export const THEME_PRESETS: Record<ThemeKey, ThemePreset> = {
  default: {
    key: "default",
    name: "Default Store Theme",
    subtitle: "Classic Gold & Premium Dark Navy Palette",
    badgeTag: "ORIGINAL",
    palette: {
      primary: {
        main: "#febe4c",
        light: "#fecd77",
        dark: "#d97706",
        contrastText: "#0f172a",
      },
      secondary: {
        main: "#0f172a",
        light: "#1e293b",
        dark: "#042549",
        contrastText: "#ffffff",
      },
      background: {
        default: "#ffffff",
        paper: "#ffffff",
        header: "#ffffff",
        footer: "#0f172a",
      },
      marketplace: {
        accentRed: "#ef4444",
        accentYellow: "#febe4c",
        accentGreen: "#10b981",
        accentBlue: "#3b82f6",
        cardBorder: "#e2e8f0",
        highlightBadgeBg: "rgba(254,190,76,0.15)",
        highlightBadgeText: "#d97706",
      },
    },
    borderRadius: {
      card: 12,
      button: 8,
    },
  },
  daraz: {
    key: "daraz",
    name: "Daraz Theme",
    subtitle: "Vibrant Daraz Saffron Orange & Deep Sapphire Navy",
    badgeTag: "MARKETPLACE",
    palette: {
      primary: {
        main: "#F57224",
        light: "#ff8c47",
        dark: "#d65711",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#002D58",
        light: "#0a437a",
        dark: "#001b38",
        contrastText: "#ffffff",
      },
      background: {
        default: "#f5f5f5",
        paper: "#ffffff",
        header: "#ffffff",
        footer: "#F57224",
      },
      marketplace: {
        accentRed: "#e63946",
        accentYellow: "#ffb703",
        accentGreen: "#2a9d8f",
        accentBlue: "#002D58",
        cardBorder: "#ffe3d1",
        highlightBadgeBg: "rgba(245,114,36,0.12)",
        highlightBadgeText: "#F57224",
      },
    },
    borderRadius: {
      card: 8,
      button: 4,
    },
  },
  amazon: {
    key: "amazon",
    name: "Amazon Theme",
    subtitle: "Amazon Amber Orange & Dark Squid Ink Navy",
    badgeTag: "GLOBAL STORE",
    palette: {
      primary: {
        main: "#FF9900",
        light: "#ffb84d",
        dark: "#e08500",
        contrastText: "#111111",
      },
      secondary: {
        main: "#131921",
        light: "#232f3e",
        dark: "#0f141a",
        contrastText: "#ffffff",
      },
      background: {
        default: "#EAEDED",
        paper: "#ffffff",
        header: "#131921",
        footer: "#131921",
      },
      marketplace: {
        accentRed: "#cc0c39",
        accentYellow: "#FF9900",
        accentGreen: "#067d62",
        accentBlue: "#007185",
        cardBorder: "#d5d9d9",
        highlightBadgeBg: "rgba(255,153,0,0.15)",
        highlightBadgeText: "#b36b00",
      },
    },
    borderRadius: {
      card: 6,
      button: 20,
    },
  },
  ebay: {
    key: "ebay",
    name: "eBay Theme",
    subtitle: "Classic eBay Royal Blue & Multi-Color Accents",
    badgeTag: "AUCTION & STORE",
    palette: {
      primary: {
        main: "#0064D2",
        light: "#3385dd",
        dark: "#004bb5",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#E53238",
        light: "#ed5c61",
        dark: "#c41f25",
        contrastText: "#ffffff",
      },
      background: {
        default: "#f7f7f7",
        paper: "#ffffff",
        header: "#ffffff",
        footer: "#0064D2",
      },
      marketplace: {
        accentRed: "#E53238",
        accentYellow: "#F4AE01",
        accentGreen: "#86B817",
        accentBlue: "#0064D2",
        cardBorder: "#e5e5e5",
        highlightBadgeBg: "rgba(0,100,210,0.10)",
        highlightBadgeText: "#0064D2",
      },
    },
    borderRadius: {
      card: 10,
      button: 18,
    },
  },
  walmart: {
    key: "walmart",
    name: "Walmart Theme",
    subtitle: "Walmart Spark Blue & Bright Sunshine Gold",
    badgeTag: "RETAIL GIANT",
    palette: {
      primary: {
        main: "#0071DC",
        light: "#338de3",
        dark: "#0056a8",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#FFC220",
        light: "#ffce4d",
        dark: "#e5a700",
        contrastText: "#000000",
      },
      background: {
        default: "#F2F8FD",
        paper: "#ffffff",
        header: "#0071DC",
        footer: "#0071DC",
      },
      marketplace: {
        accentRed: "#de2a2a",
        accentYellow: "#FFC220",
        accentGreen: "#2e7d32",
        accentBlue: "#0071DC",
        cardBorder: "#d0e4f7",
        highlightBadgeBg: "rgba(0,113,220,0.10)",
        highlightBadgeText: "#0071DC",
      },
    },
    borderRadius: {
      card: 16,
      button: 24,
    },
  },
  aliexpress: {
    key: "aliexpress",
    name: "AliExpress Theme",
    subtitle: "Vibrant AliExpress Crimson Red & Dark Charcoal",
    badgeTag: "EXPRESS STORE",
    palette: {
      primary: {
        main: "#FF4747",
        light: "#ff6c6c",
        dark: "#d92626",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#191919",
        light: "#333333",
        dark: "#000000",
        contrastText: "#ffffff",
      },
      background: {
        default: "#f4f4f4",
        paper: "#ffffff",
        header: "#ffffff",
        footer: "#191919",
      },
      marketplace: {
        accentRed: "#FF4747",
        accentYellow: "#ffaa00",
        accentGreen: "#00b894",
        accentBlue: "#0984e3",
        cardBorder: "#ffcccc",
        highlightBadgeBg: "rgba(255,71,71,0.12)",
        highlightBadgeText: "#d92626",
      },
    },
    borderRadius: {
      card: 8,
      button: 6,
    },
  },
  temu: {
    key: "temu",
    name: "Temu Theme",
    subtitle: "High-Energy Temu Blaze Orange & Sunshine Yellow",
    badgeTag: "BARGAIN STORE",
    palette: {
      primary: {
        main: "#FF5000",
        light: "#ff7333",
        dark: "#cc4000",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#FFC600",
        light: "#ffd133",
        dark: "#d9a800",
        contrastText: "#000000",
      },
      background: {
        default: "#fff7f2",
        paper: "#ffffff",
        header: "#FF5000",
        footer: "#22140a",
      },
      marketplace: {
        accentRed: "#e03000",
        accentYellow: "#FFC600",
        accentGreen: "#20bf6b",
        accentBlue: "#3867d6",
        cardBorder: "#ffd6c2",
        highlightBadgeBg: "rgba(255,80,0,0.12)",
        highlightBadgeText: "#cc4000",
      },
    },
    borderRadius: {
      card: 14,
      button: 20,
    },
  },
};

/**
 * Normalizes and validates any input theme key string.
 * Strictly falls back to "default" for missing, invalid, or corrupted keys.
 */
export function normalizeThemeKey(rawKey?: unknown): ThemeKey {
  if (typeof rawKey === "string" && (THEME_KEYS as readonly string[]).includes(rawKey)) {
    return rawKey as ThemeKey;
  }
  return "default";
}

export function getThemePreset(key?: unknown): ThemePreset {
  const normalizedKey = normalizeThemeKey(key);
  return THEME_PRESETS[normalizedKey];
}

export function getThemePresetName(key?: unknown, shopName?: string): string {
  const normalizedKey = normalizeThemeKey(key);
  const preset = THEME_PRESETS[normalizedKey];
  if (normalizedKey === "default") {
    const storeName = shopName?.trim();
    return storeName ? `Default (${storeName})` : "Default Store Theme";
  }
  return preset.name;
}
