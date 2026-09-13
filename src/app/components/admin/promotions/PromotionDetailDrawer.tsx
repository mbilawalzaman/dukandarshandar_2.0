"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SendIcon from "@mui/icons-material/Send";
import { authHeaders } from "@/lib/cart";
import { PROMOTION_KIND_LABELS, PROMOTION_STATUS_LABELS, type Promotion, type PromotionRedemption } from "@/types/apps/promotionTypes";
import { STATUS_COLORS, conditionsLabel, formatDateRange, formatPromoDate, rewardLabel, scopeLabel } from "@/lib/promotionDisplay";
import PromotionBadge from "@/app/components/promotions/PromotionBadge";

type Props = {
  promotion: Promotion | null;
  onClose: () => void;
  onEdit: (p: Promotion) => void;
  onTogglePause: (p: Promotion) => void;
  onDuplicate: (p: Promotion) => void;
  onSendEmail: (p: Promotion) => void;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", flex: 1, minWidth: 110 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
      <Typography variant="h6" fontWeight={800} color="#0f172a">{value}</Typography>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", gap: 2, py: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 96 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={600} color="#0f172a">{value}</Typography>
    </Box>
  );
}

/** Right-hand drawer with stats, rules and the redemption log for one promotion. */
export default function PromotionDetailDrawer({ promotion, onClose, onEdit, onTogglePause, onDuplicate, onSendEmail }: Props) {
  const [redemptions, setRedemptions] = useState<PromotionRedemption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!promotion?._id) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/promotions/${promotion._id}/redemptions?limit=50`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => !cancelled && d.success && setRedemptions(d.redemptions))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [promotion?._id]);

  const p = promotion;
  const status = p ? STATUS_COLORS[p.status] : STATUS_COLORS.draft;

  return (
    <Drawer anchor="right" open={Boolean(p)} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 480 }, p: 3 } }}>
      {p && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
            <Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", mb: 0.5 }}>
                <Chip label={PROMOTION_STATUS_LABELS[p.status]} size="small" sx={{ backgroundColor: status.bg, color: status.fg, fontWeight: 700 }} />
                <Chip label={PROMOTION_KIND_LABELS[p.kind]} size="small" variant="outlined" />
                <PromotionBadge badge={p.badge} />
              </Box>
              <Typography variant="h6" fontWeight={800} color="#0f172a">{p.name}</Typography>
              {p.code && (
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 }}>{p.code} · {p.visibility}</Typography>
              )}
            </Box>
            <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Stat label="Redemptions" value={`${p.stats.timesUsed}${p.limits.totalUses ? ` / ${p.limits.totalUses}` : ""}`} />
            <Stat label="Discount given" value={`PKR ${p.stats.totalDiscountGiven.toLocaleString()}`} />
            <Stat label="Order revenue" value={`PKR ${p.stats.revenue.toLocaleString()}`} />
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(p)} sx={{ textTransform: "none" }}>Edit</Button>
            <Button size="small" variant="outlined" startIcon={p.isPaused ? <PlayCircleOutlineIcon /> : <PauseCircleOutlineIcon />} onClick={() => onTogglePause(p)} sx={{ textTransform: "none" }}>
              {p.isPaused ? "Resume" : "Pause"}
            </Button>
            <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => onDuplicate(p)} sx={{ textTransform: "none" }}>Duplicate</Button>
            {p.kind === "voucher" && (
              <Button size="small" variant="contained" startIcon={<SendIcon />} onClick={() => onSendEmail(p)} sx={{ textTransform: "none", backgroundColor: "#0284c7", color: "#fff", "&:hover": { backgroundColor: "#0369a1" } }}>
                Send email
              </Button>
            )}
          </Box>

          <Divider />

          <Box>
            <Row label="Period" value={formatDateRange(p.startAt, p.endAt)} />
            <Row label="Reward" value={rewardLabel(p.reward)} />
            <Row label="Applies to" value={scopeLabel(p.scope)} />
            <Row label="Conditions" value={conditionsLabel(p.conditions)} />
            <Row label="Per customer" value={p.limits.perCustomer ? String(p.limits.perCustomer) : "Unlimited"} />
            <Row label="Stacking" value={p.stackable ? "Stackable" : "Exclusive"} />
            {p.description && <Row label="Terms" value={p.description} />}
          </Box>

          {p.perProduct && p.perProduct.length > 0 && (
            <>
              <Divider />
              <Typography variant="subtitle2" fontWeight={700}>Products ({p.perProduct.length})</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Sale</TableCell>
                    <TableCell align="right">Sold</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {p.perProduct.map((d) => (
                    <TableRow key={d.productId}>
                      <TableCell>{d.productName || d.productId}</TableCell>
                      <TableCell align="right">PKR {d.salePrice.toLocaleString()}</TableCell>
                      <TableCell align="right">{d.sold}{d.stockLimit ? ` / ${d.stockLimit}` : ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          <Divider />
          <Typography variant="subtitle2" fontWeight={700}>Recent redemptions</Typography>
          {loading ? (
            <Typography variant="body2" color="text.secondary">Loading…</Typography>
          ) : redemptions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No redemptions yet.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {redemptions.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell>{formatPromoDate(r.createdAt)}</TableCell>
                    <TableCell sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{r.customerEmail || r.customerId || "—"}</TableCell>
                    <TableCell align="right">PKR {r.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      )}
    </Drawer>
  );
}
