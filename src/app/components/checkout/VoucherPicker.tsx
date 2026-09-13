"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, CircularProgress, Collapse, TextField, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { authHeaders } from "@/lib/cart";
import type { EngineCartItem } from "@/lib/promotionEngine";
import { usePromotions } from "@/app/providers/PromotionProvider";
import VoucherCard, { type VoucherCardData } from "@/app/components/promotions/VoucherCard";

type Props = {
  items: EngineCartItem[];
  shippingFee: number;
  appliedCode: string | null;
  applying: boolean;
  onApply: (code: string) => void;
  onRemove: () => void;
};

/**
 * Checkout voucher selector: manual code entry plus the customer's wallet
 * (or public vouchers for guests), each pre-checked against the cart.
 */
export default function VoucherPicker({ items, shippingFee, appliedCode, applying, onApply, onRemove }: Props) {
  const { promotions, quoteLocal } = usePromotions();
  const [input, setInput] = useState("");
  const [wallet, setWallet] = useState<VoucherCardData[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;
    fetch("/api/promotions/mine", { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.success && setWallet(d.vouchers))
      .catch(() => undefined);
  }, []);

  const candidates = useMemo<VoucherCardData[]>(() => {
    const list = wallet ?? promotions.filter((p) => p.kind === "voucher");
    // Pre-check each voucher against the current cart so we can explain why one is not usable.
    return list
      .filter((v) => v.code)
      .map((v) => {
        const r = quoteLocal(items, { shippingFee, voucherCode: v.code });
        const rejection = r.rejected.find((x) => x.code === v.code);
        return { ...v, disabledReason: rejection?.reason === "per_customer_limit" ? undefined : rejection?.message } as VoucherCardData & { disabledReason?: string };
      })
      .sort((a, b) => Number(Boolean((a as { disabledReason?: string }).disabledReason)) - Number(Boolean((b as { disabledReason?: string }).disabledReason)));
  }, [wallet, promotions, items, shippingFee, quoteLocal]);

  return (
    <Box sx={{ mb: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
      {appliedCode ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, borderRadius: 2, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">VOUCHER APPLIED</Typography>
            <Typography variant="subtitle2" fontWeight={800} color="#166534">{appliedCode}</Typography>
          </Box>
          <Button size="small" color="error" onClick={onRemove} sx={{ textTransform: "none", fontWeight: 700 }}>Remove</Button>
        </Box>
      ) : (
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            size="small"
            placeholder="Enter voucher code"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && input.trim() && onApply(input.trim())}
            fullWidth
          />
          <Button
            variant="contained"
            disabled={applying || !input.trim()}
            onClick={() => onApply(input.trim())}
            sx={{ backgroundColor: "#0f172a", color: "#fff", fontWeight: 700, textTransform: "none", px: 2.5, whiteSpace: "nowrap", "&:hover": { backgroundColor: "#1e293b" } }}
          >
            {applying ? <CircularProgress size={16} color="inherit" /> : "Apply"}
          </Button>
        </Box>
      )}

      {candidates.length > 0 && (
        <Box>
          <Button size="small" onClick={() => setOpen((o) => !o)} endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />} sx={{ textTransform: "none", fontWeight: 700, px: 0 }}>
            {wallet ? "My vouchers" : "Available vouchers"} ({candidates.length})
          </Button>
          <Collapse in={open}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
              {candidates.map((v) => {
                const reason = (v as { disabledReason?: string }).disabledReason;
                const selected = appliedCode === v.code;
                return (
                  <VoucherCard
                    key={v._id}
                    voucher={v}
                    compact
                    selected={selected}
                    disabledReason={reason}
                    actionLabel={selected ? "Applied" : "Apply"}
                    actionDisabled={selected || applying}
                    onAction={(x) => x.code && onApply(x.code)}
                  />
                );
              })}
            </Box>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}
