"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Chip, Typography } from "@mui/material";
import { authHeaders } from "@/lib/cart";
import { rewardLabel } from "@/lib/promotionDisplay";
import { usePromotions } from "@/app/providers/PromotionProvider";
import { useCart } from "@/app/providers/CartProvider";
import VoucherCard, { type VoucherCardData } from "./VoucherCard";
import PromotionBadge from "./PromotionBadge";

type Props = { product: { _id: string; price: number; category?: string } };

/**
 * Product-page strip: collectible vouchers plus bundle / free-delivery offers that
 * apply to this product. Collect requires a signed-in (non-guest) account.
 */
export default function VoucherStrip({ product }: Props) {
  const router = useRouter();
  const { toast } = useCart();
  const { offersFor } = usePromotions();
  const offers = useMemo(() => offersFor(product), [offersFor, product]);
  const [collected, setCollected] = useState<Set<string>>(new Set());

  const isSignedIn = useCallback(() => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("token");
    return Boolean(token);
  }, []);

  // Pre-mark vouchers already in the wallet.
  useEffect(() => {
    if (!isSignedIn() || offers.every((o) => o.kind !== "voucher")) return;
    fetch("/api/promotions/mine", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        setCollected(new Set((d.vouchers as VoucherCardData[]).filter((v) => v.collected).map((v) => String(v._id))));
      })
      .catch(() => undefined);
  }, [isSignedIn, offers]);

  const collect = async (v: VoucherCardData) => {
    if (!isSignedIn()) {
      router.push(`/login?next=/products/${product._id}`);
      return;
    }
    const res = await fetch(`/api/promotions/${v._id}/collect`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    if (res.status === 403) {
      router.push(`/login?next=/products/${product._id}`);
      return;
    }
    if (res.ok && data.success) {
      setCollected((prev) => new Set(prev).add(String(v._id)));
      toast(data.message || "Voucher collected", "success");
    } else toast(data.error || "Could not collect voucher", "error");
  };

  if (offers.length === 0) return null;

  const vouchers = offers.filter((o) => o.kind === "voucher");
  const others = offers.filter((o) => o.kind !== "voucher");

  return (
    <Box sx={{ mt: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
      {others.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          {others.map((o) => (
            <Box key={o._id} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <PromotionBadge badge={o.badge} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{rewardLabel(o.reward)}</Typography>
            </Box>
          ))}
        </Box>
      )}
      {vouchers.length > 0 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">Vouchers</Typography>
            <Chip label={`${vouchers.length} available`} size="small" sx={{ height: 20, fontSize: "0.65rem" }} />
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 0.5 }}>
            {vouchers.map((v) => {
              const isCollected = collected.has(String(v._id));
              return (
                <VoucherCard
                  key={v._id}
                  voucher={{ ...v, collected: isCollected }}
                  compact
                  actionLabel={isCollected ? "In your wallet" : "Collect"}
                  actionDisabled={isCollected}
                  onAction={collect}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
