"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Box, Button, Chip, IconButton, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SendIcon from "@mui/icons-material/Send";
import { authHeaders } from "@/lib/cart";
import {
  PROMOTION_KIND_LABELS,
  PROMOTION_KINDS,
  PROMOTION_STATUS_LABELS,
  type Promotion,
  type PromotionKind,
  type PromotionStatus,
} from "@/types/apps/promotionTypes";
import { KIND_COLORS, STATUS_COLORS, formatDateRange, rewardLabel, scopeLabel } from "@/lib/promotionDisplay";
import AdminDataTable, { type ColumnDef } from "@/app/components/admin/AdminDataTable";
import ConfirmDeleteModal from "@/app/components/admin/ConfirmDeleteModal";
import PromotionFormModal from "@/app/components/admin/promotions/PromotionFormModal";
import PromotionDetailDrawer from "@/app/components/admin/promotions/PromotionDetailDrawer";
import SendPromoModal from "@/app/components/admin/SendPromoModal";
import PromotionBadge from "@/app/components/promotions/PromotionBadge";

const STATUS_TABS: Array<PromotionStatus | "all"> = ["all", "active", "scheduled", "paused", "expired", "draft"];

/** Row type: Promotion plus a virtual column for the extra action icons. */
type Row = Promotion & { more?: never };

const primaryButtonSx = { textTransform: "none", fontWeight: 700, borderRadius: "24px", px: 3, backgroundColor: "#0284c7", color: "#fff", "&:hover": { backgroundColor: "#0369a1" } } as const;

function PromotionsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kindFilter = (searchParams.get("kind") as PromotionKind | null) || null;

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusTab, setStatusTab] = useState<PromotionStatus | "all">("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [viewing, setViewing] = useState<Promotion | null>(null);
  const [sending, setSending] = useState<Promotion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const qs = kindFilter ? `?kind=${kindFilter}` : "";
      const res = await fetch(`/api/admin/promotions${qs}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setPromotions(data.promotions);
      else setError(data.error || "Failed to load promotions.");
    } catch {
      setError("Failed to load promotions.");
    } finally {
      setLoading(false);
    }
  }, [kindFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(
    () => (statusTab === "all" ? promotions : promotions.filter((p) => p.status === statusTab)) as Row[],
    [promotions, statusTab]
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: promotions.length };
    for (const p of promotions) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }, [promotions]);

  const replaceRow = (saved: Promotion) => {
    setPromotions((prev) => (prev.some((p) => p._id === saved._id) ? prev.map((p) => (p._id === saved._id ? saved : p)) : [saved, ...prev]));
    setViewing((v) => (v && v._id === saved._id ? saved : v));
  };

  const togglePause = async (p: Promotion) => {
    const res = await fetch(`/api/admin/promotions/${p._id}/pause`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ paused: !p.isPaused }) });
    const data = await res.json();
    if (res.ok && data.success) replaceRow(data.promotion);
    else setError(data.error || "Failed to update promotion.");
  };

  const duplicate = async (p: Promotion) => {
    const res = await fetch(`/api/admin/promotions/${p._id}/duplicate`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    if (res.ok && data.success) {
      replaceRow(data.promotion);
      setEditing(data.promotion);
      setFormOpen(true);
    } else setError(data.error || "Failed to duplicate promotion.");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/promotions/${deleteTarget._id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setPromotions((prev) => prev.filter((p) => p._id !== deleteTarget._id));
        setDeleteTarget(null);
        setViewing(null);
      } else setError(data.error || "Failed to delete promotion.");
    } catch {
      setError("Failed to delete promotion.");
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Promotion) => {
    setEditing(p);
    setFormOpen(true);
  };

  const columns: ColumnDef<Row>[] = [
    {
      id: "name",
      label: "Promotion",
      minWidth: 240,
      format: (_v, row) => (
        <Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="body2" fontWeight={700}>{row.name}</Typography>
            <PromotionBadge badge={row.badge} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {row.code ? `${row.code} · ${row.visibility} · ` : ""}{scopeLabel(row.scope)}
          </Typography>
        </Box>
      ),
    },
    { id: "kind", label: "Kind", format: (_v, row) => <Chip label={PROMOTION_KIND_LABELS[row.kind]} size="small" sx={{ backgroundColor: `${KIND_COLORS[row.kind]}1a`, color: KIND_COLORS[row.kind], fontWeight: 700 }} /> },
    {
      id: "status",
      label: "Status",
      format: (_v, row) => {
        const c = STATUS_COLORS[row.status];
        return <Chip label={PROMOTION_STATUS_LABELS[row.status]} size="small" sx={{ backgroundColor: c.bg, color: c.fg, fontWeight: 700 }} />;
      },
    },
    { id: "reward", label: "Reward", minWidth: 160, format: (_v, row) => <Typography variant="body2" fontWeight={600}>{rewardLabel(row.reward)}</Typography> },
    { id: "startAt", label: "Period", minWidth: 180, format: (_v, row) => <Typography variant="body2">{formatDateRange(row.startAt, row.endAt)}</Typography> },
    {
      id: "stats",
      label: "Used",
      align: "right",
      format: (_v, row) => (
        <Box>
          <Typography variant="body2" fontWeight={700}>{row.stats.timesUsed}{row.limits.totalUses ? ` / ${row.limits.totalUses}` : ""}</Typography>
          <Typography variant="caption" color="text.secondary">PKR {row.stats.totalDiscountGiven.toLocaleString()} off</Typography>
        </Box>
      ),
    },
    {
      id: "more",
      label: "",
      align: "right",
      minWidth: 120,
      format: (_v, row) => (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.25 }}>
          <Tooltip title={row.isPaused ? "Resume" : "Pause"}>
            <IconButton size="small" onClick={() => togglePause(row)} sx={{ color: row.isPaused ? "#16a34a" : "#f59e0b" }}>
              {row.isPaused ? <PlayCircleOutlineIcon fontSize="small" /> : <PauseCircleOutlineIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Duplicate">
            <IconButton size="small" onClick={() => duplicate(row)} sx={{ color: "#64748b" }}><ContentCopyIcon fontSize="small" /></IconButton>
          </Tooltip>
          {row.kind === "voucher" && (
            <Tooltip title="Send by email">
              <IconButton size="small" onClick={() => setSending(row)} sx={{ color: "#0284c7" }}><SendIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
    { id: "actions", label: "Actions", align: "right" },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, margin: "0 auto" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: "#0f172a", letterSpacing: -0.5 }}>
            {kindFilter ? PROMOTION_KIND_LABELS[kindFilter] + "s" : "Promotions"}
          </Typography>
          <Typography variant="body2" color="text.secondary">Product discounts, flash sales, vouchers, free delivery and bundle deals.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={primaryButtonSx}>
          Create promotion
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        <Chip label="All kinds" clickable color={!kindFilter ? "primary" : "default"} onClick={() => router.push("/admin/promotions")} />
        {PROMOTION_KINDS.map((k) => (
          <Chip key={k} label={PROMOTION_KIND_LABELS[k]} clickable color={kindFilter === k ? "primary" : "default"} onClick={() => router.push(`/admin/promotions?kind=${k}`)} />
        ))}
      </Box>

      <Tabs value={statusTab} onChange={(_e, v) => setStatusTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2, borderBottom: "1px solid #e2e8f0" }}>
        {STATUS_TABS.map((s) => (
          <Tab key={s} value={s} label={`${s === "all" ? "All" : PROMOTION_STATUS_LABELS[s]} (${counts[s] || 0})`} sx={{ textTransform: "none", fontWeight: 600 }} />
        ))}
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <AdminDataTable<Row>
        title={statusTab === "all" ? "All promotions" : PROMOTION_STATUS_LABELS[statusTab]}
        columns={columns}
        data={rows}
        loading={loading}
        searchPlaceholder="Search by name or code..."
        onView={(row) => setViewing(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <PromotionFormModal open={formOpen} onClose={() => setFormOpen(false)} promotion={editing} defaultKind={kindFilter || "voucher"} onSaved={replaceRow} />

      <PromotionDetailDrawer
        promotion={viewing}
        onClose={() => setViewing(null)}
        onEdit={(p) => { setViewing(null); openEdit(p); }}
        onTogglePause={togglePause}
        onDuplicate={(p) => { setViewing(null); duplicate(p); }}
        onSendEmail={(p) => setSending(p)}
      />

      <SendPromoModal open={Boolean(sending)} onClose={() => setSending(null)} promotion={sending} />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete promotion"
        message={`Delete "${deleteTarget?.name ?? ""}"? Past orders keep their discount lines, but the redemption history will no longer link to a promotion.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => (deleting ? undefined : setDeleteTarget(null))}
      />
    </Box>
  );
}

export default function AdminPromotionsPage() {
  return (
    <Suspense fallback={null}>
      <PromotionsPageInner />
    </Suspense>
  );
}
