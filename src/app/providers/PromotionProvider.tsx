"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PublicPromotion } from "@/types/apps/promotionTypes";
import {
  applyPromotions,
  bestDealForProduct,
  promotionsForProduct,
  type EngineCartItem,
  type EngineResult,
} from "@/lib/promotionEngine";

type ProductLike = { _id: string; price: number; category?: string };

type PromotionContextValue = {
  promotions: PublicPromotion[];
  loading: boolean;
  refresh: () => void;
  /** best live product-level deal for a product (cards, product page) */
  dealFor: (product: ProductLike) => ReturnType<typeof bestDealForProduct>;
  /** vouchers / bundles / free-shipping promos relevant to a product */
  offersFor: (product: ProductLike) => PublicPromotion[];
  /** instant client-side quote for display; the server re-quotes at checkout */
  quoteLocal: (items: EngineCartItem[], options: { shippingFee: number; voucherCode?: string | null }) => EngineResult;
};

const PromotionContext = createContext<PromotionContextValue | null>(null);

const REFRESH_MS = 5 * 60 * 1000;

export function PromotionProvider({ children }: { children: React.ReactNode }) {
  const [promotions, setPromotions] = useState<PublicPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetch("/api/promotions/active")
      .then((r) => r.json())
      .then((d) => d.success && Array.isArray(d.promotions) && setPromotions(d.promotions))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const value = useMemo<PromotionContextValue>(
    () => ({
      promotions,
      loading,
      refresh,
      dealFor: (product) => bestDealForProduct(product, promotions),
      offersFor: (product) => promotionsForProduct(product, promotions) as PublicPromotion[],
      quoteLocal: (items, { shippingFee, voucherCode }) => applyPromotions({ items, promotions, shippingFee, voucherCode }),
    }),
    [promotions, loading, refresh]
  );

  return <PromotionContext.Provider value={value}>{children}</PromotionContext.Provider>;
}

export function usePromotions() {
  const ctx = useContext(PromotionContext);
  if (!ctx) throw new Error("usePromotions must be used within PromotionProvider");
  return ctx;
}
