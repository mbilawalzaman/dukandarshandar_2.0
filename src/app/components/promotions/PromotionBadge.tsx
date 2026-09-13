"use client";

import { Chip, type SxProps, type Theme } from "@mui/material";
import type { PromotionBadge as Badge } from "@/types/apps/promotionTypes";

type Props = {
  badge?: Badge | null;
  size?: "small" | "medium";
  sx?: SxProps<Theme>;
};

/** Coloured pill used on product cards, cart lines, admin tables and previews. */
export default function PromotionBadge({ badge, size = "small", sx }: Props) {
  if (!badge?.label) return null;
  return (
    <Chip
      label={badge.label}
      size={size}
      sx={{
        backgroundColor: badge.color || "#dc2626",
        color: "#fff",
        fontWeight: 800,
        letterSpacing: 0.3,
        borderRadius: 1.5,
        height: size === "small" ? 22 : 28,
        fontSize: size === "small" ? "0.7rem" : "0.8rem",
        ...sx,
      }}
    />
  );
}
