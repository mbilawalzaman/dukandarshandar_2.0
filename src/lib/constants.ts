export const BRAND = {
  gold: "#febe4c",
  goldHover: "#f99f04",
  goldDark: "#d97706",
  navy: "#0f172a",
  muted: "#58575c",
  surface: "#f8fafc",
  footer: "#111111",
} as const;

export const PRODUCT_CATEGORIES = [
  "Stationery",
  "Craft",
  "Clock",
  "Pen",
  "Diary",
  "Bags",
  "Other",
] as const;

export const PRICE_FILTERS = [0, 100, 200, 300, 500, 1000] as const;

export const SHIPPING_FEE = 250;

/** Store timezone for promotion day boundaries and customer-facing dates (Pakistan, no DST). */
export const STORE_TIMEZONE = "Asia/Karachi";
export const STORE_UTC_OFFSET_MINUTES = 5 * 60;

export const TOKEN_COOKIE = "ds_token";
export const REFRESH_TOKEN_COOKIE = "ds_refresh_token";

/** Access JWT lifetime (seconds) */
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 15; // 15 minutes
/** Refresh token lifetime (seconds) */
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24; // 1 day
