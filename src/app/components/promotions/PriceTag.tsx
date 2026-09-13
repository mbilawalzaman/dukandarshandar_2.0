"use client";

import { Box, Typography } from "@mui/material";
import PromotionBadge from "./PromotionBadge";
import type { PromotionBadge as Badge } from "@/types/apps/promotionTypes";

type Props = {
  price: number;
  /** when lower than price, price is struck through */
  salePrice?: number | null;
  badge?: Badge | null;
  size?: "small" | "medium" | "large";
  suffix?: React.ReactNode;
};

const SIZES = {
  small: { main: "1.05rem", strike: "0.8rem" },
  medium: { main: "1.25rem", strike: "0.9rem" },
  large: { main: "1.6rem", strike: "1rem" },
};

/** Price with optional sale price, strike-through original and badge. Used on cards, product page and cart. */
export default function PriceTag({ price, salePrice, badge, size = "small", suffix }: Props) {
  const onSale = typeof salePrice === "number" && salePrice < price;
  const s = SIZES[size];
  return (
    <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
      <Typography component="span" sx={{ fontWeight: 800, fontSize: s.main, color: onSale ? "#dc2626" : "#0f172a", lineHeight: 1.2 }}>
        PKR {Number(onSale ? salePrice : price).toLocaleString()}
      </Typography>
      {onSale && (
        <Typography component="span" sx={{ fontSize: s.strike, color: "#94a3b8", textDecoration: "line-through", fontWeight: 500 }}>
          PKR {Number(price).toLocaleString()}
        </Typography>
      )}
      {onSale && badge && <PromotionBadge badge={badge} />}
      {suffix}
    </Box>
  );
}
