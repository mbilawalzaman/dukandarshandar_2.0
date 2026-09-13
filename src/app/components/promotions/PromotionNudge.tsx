"use client";

import Link from "next/link";
import { Alert, Typography } from "@mui/material";
import type { EngineHint } from "@/lib/promotionEngine";

type Props = { hints: EngineHint[]; voucherCount?: number };

/** "Add Rs. 300 more for free delivery" style nudge from engine hints, plus a voucher reminder. */
export default function PromotionNudge({ hints, voucherCount = 0 }: Props) {
  const hint = hints[0];
  if (!hint && voucherCount === 0) return null;

  return (
    <Alert severity="info" icon={false} sx={{ my: 1.5, borderRadius: 2, backgroundColor: "#eff6ff", color: "#1e3a8a", py: 0.5 }}>
      {hint && (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {hint.amountShort
            ? `Add PKR ${hint.amountShort.toLocaleString()} more to unlock "${hint.name}".`
            : hint.itemsShort
            ? `Add ${hint.itemsShort} more item${hint.itemsShort === 1 ? "" : "s"} to unlock "${hint.name}".`
            : `You are close to unlocking "${hint.name}".`}
        </Typography>
      )}
      {voucherCount > 0 && (
        <Typography variant="caption" sx={{ display: "block", mt: hint ? 0.5 : 0 }}>
          {voucherCount} voucher{voucherCount === 1 ? "" : "s"} available.{" "}
          <Link href="/vouchers" style={{ fontWeight: 700, color: "inherit" }}>
            View vouchers
          </Link>{" "}
          or apply one at checkout.
        </Typography>
      )}
    </Alert>
  );
}
