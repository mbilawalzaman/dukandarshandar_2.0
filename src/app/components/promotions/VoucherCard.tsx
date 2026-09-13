"use client";

import { Box, Button, Chip, Typography } from "@mui/material";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import { BRAND } from "@/lib/constants";
import { conditionsLabel, formatPromoDate, rewardLabel } from "@/lib/promotionDisplay";
import type { PublicPromotion } from "@/types/apps/promotionTypes";

export type VoucherCardData = PublicPromotion & { collected?: boolean; usedByMe?: number; collectedAt?: string };

type Props = {
  voucher: VoucherCardData;
  /** primary action label; omit to hide the button */
  actionLabel?: string;
  onAction?: (v: VoucherCardData) => void;
  actionDisabled?: boolean;
  selected?: boolean;
  /** shows "not applicable" styling with this message */
  disabledReason?: string;
  compact?: boolean;
};

/** Ticket-style voucher used on product pages, at checkout and in the voucher wallet. */
export default function VoucherCard({ voucher, actionLabel, onAction, actionDisabled, selected, disabledReason, compact }: Props) {
  const expired = voucher.status === "expired";
  const usedUp = Boolean(voucher.limits?.perCustomer && (voucher.usedByMe || 0) >= voucher.limits.perCustomer);
  const inactive = expired || usedUp || Boolean(disabledReason);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "stretch",
        borderRadius: 2.5,
        border: `1px ${selected ? "solid" : "dashed"} ${selected ? BRAND.gold : "#cbd5e1"}`,
        backgroundColor: inactive ? "#f8fafc" : selected ? "#fffbeb" : "#fff",
        opacity: inactive ? 0.7 : 1,
        overflow: "hidden",
        minWidth: compact ? 240 : undefined,
      }}
    >
      <Box sx={{ width: 6, backgroundColor: voucher.badge?.color || "#16a34a" }} />
      <Box sx={{ p: compact ? 1.5 : 2, flex: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <ConfirmationNumberOutlinedIcon sx={{ fontSize: 18, color: voucher.badge?.color || "#16a34a" }} />
          <Typography variant="subtitle2" fontWeight={800} color={BRAND.navy}>{rewardLabel(voucher.reward)}</Typography>
          {voucher.code && (
            <Chip label={voucher.code} size="small" sx={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: 1, height: 22 }} />
          )}
          {voucher.collected && <Chip label="Collected" size="small" color="success" variant="outlined" sx={{ height: 22 }} />}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {conditionsLabel(voucher.conditions)} · Valid till {formatPromoDate(voucher.endAt)}
        </Typography>
        {(disabledReason || usedUp || expired) && (
          <Typography variant="caption" color="error" fontWeight={600}>
            {disabledReason || (expired ? "Expired" : "Already used")}
          </Typography>
        )}
        {actionLabel && onAction && (
          <Button
            size="small"
            variant={selected ? "contained" : "outlined"}
            disabled={actionDisabled || inactive}
            onClick={() => onAction(voucher)}
            sx={{ alignSelf: "flex-start", mt: 0.5, textTransform: "none", fontWeight: 700, borderRadius: 2 }}
          >
            {actionLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
}
