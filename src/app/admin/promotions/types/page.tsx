"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Switch, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RestoreIcon from "@mui/icons-material/Restore";
import { authHeaders } from "@/lib/cart";
import { PROMOTION_KIND_LABELS, type PromotionType } from "@/types/apps/promotionTypes";
import { KIND_COLORS, conditionsLabel, rewardLabel, scopeLabel } from "@/lib/promotionDisplay";
import AdminDataTable, { type ColumnDef } from "@/app/components/admin/AdminDataTable";
import ConfirmDeleteModal from "@/app/components/admin/ConfirmDeleteModal";
import PromotionTypeFormModal from "@/app/components/admin/promotions/PromotionTypeFormModal";
import PromotionBadge from "@/app/components/promotions/PromotionBadge";

const primaryButtonSx = { textTransform: "none", fontWeight: 700, borderRadius: "24px", px: 3, backgroundColor: "#0284c7", color: "#fff", "&:hover": { backgroundColor: "#0369a1" } } as const;

export default function AdminPromotionTypesPage() {
  const [types, setTypes] = useState<PromotionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<PromotionType | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromotionType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/promotion-types?all=true", { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setTypes(data.types);
      else setError(data.error || "Failed to load promotion types.");
    } catch {
      setError("Failed to load promotion types.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (t: PromotionType) => {
    setTypes((prev) => prev.map((x) => (x._id === t._id ? { ...x, isActive: !t.isActive } : x)));
    const res = await fetch(`/api/admin/promotion-types/${t._id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ isActive: !t.isActive }) });
    if (!res.ok) load();
  };

  const restorePresets = async () => {
    setNotice("");
    const res = await fetch("/api/admin/promotion-types/seed", { method: "POST", headers: authHeaders() });
    const data = await res.json();
    if (data.success) {
      setNotice(data.inserted ? `Restored ${data.inserted} preset(s).` : "All system presets are already present.");
      load();
    } else setError(data.error || "Failed to restore presets.");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/promotion-types/${deleteTarget._id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setTypes((prev) => prev.filter((t) => t._id !== deleteTarget._id));
        setDeleteTarget(null);
      } else setError(data.error || "Failed to delete preset.");
    } catch {
      setError("Failed to delete preset.");
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<PromotionType>[] = [
    {
      id: "name",
      label: "Preset",
      minWidth: 220,
      format: (_v, row) => (
        <Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Typography variant="body2" fontWeight={700}>{row.name}</Typography>
            {row.isSystem && <Chip label="System" size="small" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />}
          </Box>
          <Typography variant="caption" color="text.secondary">{row.description}</Typography>
        </Box>
      ),
    },
    { id: "kind", label: "Kind", format: (_v, row) => <Chip label={PROMOTION_KIND_LABELS[row.kind]} size="small" sx={{ backgroundColor: `${KIND_COLORS[row.kind]}1a`, color: KIND_COLORS[row.kind], fontWeight: 700 }} /> },
    {
      id: "defaults",
      label: "Defaults",
      minWidth: 260,
      format: (_v, row) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{rewardLabel(row.defaults.reward)}</Typography>
          <Typography variant="caption" color="text.secondary">{scopeLabel(row.defaults.scope)} · {conditionsLabel(row.defaults.conditions)}</Typography>
        </Box>
      ),
    },
    { id: "isActive", label: "Badge", format: (_v, row) => <PromotionBadge badge={row.defaults.badge} /> },
    { id: "isSystem", label: "Active", align: "center", format: (_v, row) => <Switch size="small" checked={row.isActive} onChange={() => toggleActive(row)} color="success" /> },
    { id: "actions", label: "Actions", align: "right" },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, margin: "0 auto" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: "#0f172a", letterSpacing: -0.5 }}>Promotion Types</Typography>
          <Typography variant="body2" color="text.secondary">Reusable presets that pre-fill the promotion builder. Editing a preset does not change promotions already created from it.</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" startIcon={<RestoreIcon />} onClick={restorePresets} sx={{ textTransform: "none", borderRadius: "24px" }}>Restore presets</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setFormOpen(true); }} sx={primaryButtonSx}>New type</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}

      <AdminDataTable<PromotionType>
        title="Presets"
        columns={columns}
        data={types}
        loading={loading}
        searchPlaceholder="Search presets..."
        onEdit={(row) => { setEditing(row); setFormOpen(true); }}
        onDelete={(row) => (row.isSystem ? setError("System presets cannot be deleted. Deactivate it instead.") : setDeleteTarget(row))}
      />

      <PromotionTypeFormModal open={formOpen} onClose={() => setFormOpen(false)} type={editing} onSaved={() => load()} />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete promotion type"
        message={`Delete "${deleteTarget?.name ?? ""}"? Promotions created from it are not affected.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => (deleting ? undefined : setDeleteTarget(null))}
      />
    </Box>
  );
}
