"use client";

import { jwtDecode } from "jwt-decode";
import { REFRESH_TOKEN_COOKIE, TOKEN_COOKIE } from "@/lib/constants";

type RefreshResponse = {
  success?: boolean;
  token?: string;
  error?: string;
};

const LOGOUT_GUARD_KEY = "ds_skip_refresh";

let refreshPromise: Promise<string | null> | null = null;

function expireCookie(name: string) {
  // Match path used when setting cookies; cover common host-only cookies.
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax; Secure`;
  }
}

export function persistAccessToken(token: string) {
  sessionStorage.removeItem(LOGOUT_GUARD_KEY);
  localStorage.setItem("token", token);
  window.dispatchEvent(new Event("authChange"));
}

/** Clear access token + both auth cookies on the client. Blocks refresh until next login. */
export function clearClientAuth() {
  sessionStorage.setItem(LOGOUT_GUARD_KEY, "1");
  localStorage.removeItem("token");
  expireCookie(TOKEN_COOKIE);
  expireCookie(REFRESH_TOKEN_COOKIE);
  window.dispatchEvent(new Event("authChange"));
}

/** Full client logout helper used by Navbar / admin. */
export async function logoutClientSession(): Promise<void> {
  clearClientAuth();
  try {
    // Drop cart so the next session starts empty
    const { clearCart } = await import("@/lib/cart");
    clearCart();
  } catch {
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("cartChange"));
  }
  localStorage.removeItem("userImage");
  try {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type: "logout" }),
    });
  } catch {
    /* ignore network errors — client cookies already cleared */
  }
  // Ensure cookies stay gone even if a racing refresh set them again
  clearClientAuth();
}

/** Refresh access JWT using httpOnly refresh cookie. Dedupes concurrent calls. */
export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (sessionStorage.getItem(LOGOUT_GUARD_KEY) === "1") return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        if (sessionStorage.getItem(LOGOUT_GUARD_KEY) === "1") return null;

        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const data = (await res.json()) as RefreshResponse;
        if (!res.ok || !data.success || !data.token) {
          localStorage.removeItem("token");
          return null;
        }
        if (sessionStorage.getItem(LOGOUT_GUARD_KEY) === "1") return null;
        persistAccessToken(data.token);
        return data.token;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

/** If access token missing or expires within `skewSeconds`, try refresh. */
export async function ensureFreshAccessToken(skewSeconds = 120): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (sessionStorage.getItem(LOGOUT_GUARD_KEY) === "1") return null;

  const token = localStorage.getItem("token");

  if (!token) {
    return refreshAccessToken();
  }

  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    const exp = decoded.exp;
    if (!exp) return token;
    const now = Math.floor(Date.now() / 1000);
    if (exp - now > skewSeconds) return token;
  } catch {
    /* fall through to refresh */
  }

  return refreshAccessToken();
}

/**
 * fetch wrapper: credentials include + one 401 retry after refresh.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  await ensureFreshAccessToken();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const first = await fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });

  if (first.status !== 401) return first;

  const refreshed = await refreshAccessToken();
  if (!refreshed) return first;

  const retryHeaders = new Headers(init.headers || {});
  retryHeaders.set("Authorization", `Bearer ${refreshed}`);
  if (!retryHeaders.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    retryHeaders.set("Content-Type", "application/json");
  }

  return fetch(input, {
    ...init,
    headers: retryHeaders,
    credentials: init.credentials ?? "include",
  });
}
