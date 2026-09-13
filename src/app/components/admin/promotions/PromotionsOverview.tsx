"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Box, Button, Chip, Grid, Paper, Typography } from "@mui/material";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import RedeemIcon from "@mui/icons-material/Redeem";
import SavingsIcon from "@mui/icons-material/Savings";
import StatCard from "@/app/components/admin/StatCard";
import { authHeaders } from "@/lib/cart";
import { PROMOTION_KIND_LABELS, type PromotionKind } from "@/types/apps/promotionTypes";
import { KIND_COLORS } from "@/lib/promotionDisplay";

type Summary = {
  active: number;
  scheduled: number;
  expired: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
  revenueWithPromotions: number;
  topPromotions: Array<{ _id: string; name: string; kind: PromotionKind; timesUsed: number; totalDiscountGiven: number; revenue: number }>;
};

/** Dashboard row: promotion KPIs plus the five most-redeemed campaigns. */
export default function PromotionsOverview() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/promotions/summary", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => d.success && setSummary(d.summary))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const v = (n?: number) => (loading ? "..." : (n ?? 0).toLocaleString());

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" fontWeight={700} color="#1e293b">Promotions</Typography>
        <Button component={Link} href="/admin/promotions" size="small" sx={{ textTransform: "none", fontWeight: 600 }}>Manage</Button>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active" value={v(summary?.active)} icon={<LocalOfferIcon />} color="#16a34a" subtitle={`${summary?.scheduled ?? 0} scheduled`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Redemptions" value={v(summary?.totalRedemptions)} icon={<RedeemIcon />} color="#0284c7" subtitle="Across all campaigns" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Discount given" value={loading ? "..." : `PKR ${v(summary?.totalDiscountGiven)}`} icon={<SavingsIcon />} color="#dc2626" subtitle="Total customer savings" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Promo revenue" value={loading ? "..." : `PKR ${v(summary?.revenueWithPromotions)}`} icon={<EventAvailableIcon />} color="#7c3aed" subtitle="Orders that used a promotion" />
        </Grid>
        {summary && summary.topPromotions.length > 0 && (
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e2e8f0" }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Top promotions</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {summary.topPromotions.map((p) => (
                  <Box key={p._id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip label={PROMOTION_KIND_LABELS[p.kind]} size="small" sx={{ backgroundColor: `${KIND_COLORS[p.kind]}1a`, color: KIND_COLORS[p.kind], fontWeight: 700, height: 22 }} />
                      <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {p.timesUsed} used · PKR {p.totalDiscountGiven.toLocaleString()} off · PKR {p.revenue.toLocaleString()} revenue
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
