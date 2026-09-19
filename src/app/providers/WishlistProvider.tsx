"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/authFetch";

type WishlistContextValue = {
  productIds: Set<string>;
  ready: boolean;
  toggle: (productId: string) => Promise<{ ok: boolean; message?: string }>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [productIds, setProductIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      setProductIds(new Set());
      setReady(true);
      return;
    }
    setReady(false);
    try {
      const res = await authFetch("/api/wishlist");
      const data = await res.json();
      setProductIds(res.ok && data.success ? new Set((data.products || []).map((p: { _id: string }) => String(p._id))) : new Set());
    } catch {
      setProductIds(new Set());
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener("authChange", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("authChange", load);
      window.removeEventListener("storage", load);
    };
  }, [load]);

  const toggle = useCallback(async (productId: string) => {
    if (!localStorage.getItem("token")) return { ok: false, message: "Please log in to save items" };
    const saved = productIds.has(productId);
    try {
      const res = await authFetch("/api/wishlist", { method: saved ? "DELETE" : "POST", body: JSON.stringify({ productId }) });
      const data = await res.json();
      if (!res.ok || !data.success) return { ok: false, message: data.message || "Could not update wishlist" };
      setProductIds((current) => {
        const next = new Set(current);
        if (saved) next.delete(productId); else next.add(productId);
        return next;
      });
      return { ok: true };
    } catch {
      return { ok: false, message: "Could not update wishlist" };
    }
  }, [productIds]);

  const value = useMemo(() => ({ productIds, ready, toggle }), [productIds, ready, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
}
