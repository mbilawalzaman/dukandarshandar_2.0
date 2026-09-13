"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Container, Grid, Tab, Tabs, Typography } from "@mui/material";
import PageBanner from "@/app/components/PageBanner";
import Loader from "@/app/components/loader/Loader";
import VoucherCard, { type VoucherCardData } from "@/app/components/promotions/VoucherCard";
import { authHeaders } from "@/lib/cart";
import { useCart } from "@/app/providers/CartProvider";

type TabKey = "available" | "used" | "expired";

/** Customer voucher wallet: collected + public vouchers, grouped by usability. */
export default function MyVouchersPage() {
  const router = useRouter();
  const { toast } = useCart();
  const [vouchers, setVouchers] = useState<VoucherCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabKey>("available");

  const load = () => {
    setLoading(true);
    fetch("/api/promotions/mine", { headers: authHeaders() })
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/login?next=/vouchers");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        if (d.success) setVouchers(d.vouchers);
        else setError(d.error || "Failed to load vouchers.");
      })
      .catch(() => setError("Failed to load vouchers."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [router]);

  const groups = useMemo(() => {
    const g: Record<TabKey, VoucherCardData[]> = { available: [], used: [], expired: [] };
    for (const v of vouchers) {
      const usedUp = Boolean(v.limits?.perCustomer && (v.usedByMe || 0) >= v.limits.perCustomer);
      if (v.status === "expired") g.expired.push(v);
      else if (usedUp) g.used.push(v);
      else g.available.push(v);
    }
    return g;
  }, [vouchers]);

  const collect = async (v: VoucherCardData) => {
    const res = await fetch(`/api/promotions/${v._id}/collect`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    if (res.ok && data.success) {
      toast(data.message || "Voucher collected", "success");
      setVouchers((prev) => prev.map((x) => (x._id === v._id ? { ...x, collected: true } : x)));
    } else toast(data.error || "Could not collect voucher", "error");
  };

  return (
    <Box>
      <PageBanner title="My Vouchers" subtitle="Collect vouchers and apply them at checkout" />
      <Container maxWidth="md" sx={{ py: 4, mb: 6 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 3, borderBottom: "1px solid #e2e8f0" }}>
          <Tab value="available" label={`Available (${groups.available.length})`} sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab value="used" label={`Used (${groups.used.length})`} sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab value="expired" label={`Expired (${groups.expired.length})`} sx={{ textTransform: "none", fontWeight: 600 }} />
        </Tabs>

        {loading ? (
          <Loader size={160} message="Loading your vouchers..." />
        ) : groups[tab].length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
            {tab === "available" ? "No vouchers available right now. Check product pages for new offers." : `No ${tab} vouchers.`}
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {groups[tab].map((v) => (
              <Grid item xs={12} sm={6} key={v._id}>
                <VoucherCard
                  voucher={v}
                  actionLabel={tab !== "available" ? undefined : v.collected ? "Use at checkout" : "Collect"}
                  onAction={(x) => (x.collected ? router.push(`/checkout?promo=${encodeURIComponent(x.code || "")}`) : collect(x))}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
