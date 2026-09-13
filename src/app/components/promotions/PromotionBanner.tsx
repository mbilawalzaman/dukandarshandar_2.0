"use client";

import Link from "next/link";
import { Alert, Box, Button, Typography } from "@mui/material";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { BRAND } from "@/lib/constants";
import { conditionsLabel, formatPromoDate, rewardLabel } from "@/lib/promotionDisplay";
import type { PublicPromotion } from "@/types/apps/promotionTypes";
import FreeDeliveryPromoBanner from "@/app/components/FreeDeliveryPromoBanner";
import PromotionBadge from "./PromotionBadge";

type Props = { promotion: PublicPromotion; deliveryFee?: number };

/** Homepage banner for the highest-priority live public promotion. Free-shipping reuses the existing delivery banner. */
export default function PromotionBanner({ promotion, deliveryFee }: Props) {
  if (promotion.kind === "free_shipping") {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pt: { xs: 2, md: 3 } }}>
        <FreeDeliveryPromoBanner savedAmount={deliveryFee} />
      </Box>
    );
  }

  const href = promotion.kind === "voucher" && promotion.code ? `/checkout?promo=${encodeURIComponent(promotion.code)}` : "/shop";
  const cta = promotion.kind === "voucher" ? "Use voucher" : "Shop the deal";

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pt: { xs: 2, md: 3 } }}>
      <Alert
        icon={<LocalOfferIcon fontSize="inherit" />}
        severity="info"
        sx={{
          borderRadius: 2.5,
          alignItems: "center",
          backgroundColor: "rgba(254, 190, 76, 0.14)",
          color: BRAND.navy,
          border: `1px solid ${BRAND.gold}`,
          "& .MuiAlert-icon": { color: BRAND.goldDark },
          "& .MuiAlert-message": { width: "100%" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{promotion.name}</Typography>
              <PromotionBadge badge={promotion.badge} />
            </Box>
            <Typography variant="body2" sx={{ color: BRAND.muted, mt: 0.25 }}>
              {rewardLabel(promotion.reward)}
              {promotion.code ? ` with code ${promotion.code}` : ""} · {conditionsLabel(promotion.conditions)} · till {formatPromoDate(promotion.endAt)}
            </Typography>
          </Box>
          <Button component={Link} href={href} variant="contained" size="small" sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}>
            {cta}
          </Button>
        </Box>
      </Alert>
    </Box>
  );
}
