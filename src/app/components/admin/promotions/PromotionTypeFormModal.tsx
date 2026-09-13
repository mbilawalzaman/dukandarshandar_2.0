"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { authHeaders } from "@/lib/cart";
import { PROMOTION_KIND_LABELS, PROMOTION_KINDS, type PromotionKind, type PromotionType } from "@/types/apps/promotionTypes";
import { BadgeFields, ConditionsFields, LimitsFields, RewardFields, ScopeFields } from "./PromotionRuleFields";

type Props = {
  open: boolean;
  onClose: () => void;
  type: PromotionType | null;
  onSaved: (saved: PromotionType) => void;
};

function emptyType(): Partial<PromotionType> {
  return {
    name: "",
    kind: "voucher",
    description: "",
    isActive: true,
    defaults: {
      visibility: "public",
      scope: { type: "all", categories: [] },
      conditions: {},
      reward: { type: "percentage", value: 10 },
      limits: {},
      stackable: true,
      priority: 0,
      badge: { label: "", color: "#dc2626" },
    },
  };
}

/** Create / edit a promotion-type preset. Reuses the same rule field groups as the promotion builder. */
export default function PromotionTypeFormModal({ open, onClose, type, onSaved }: Props) {
  const [form, setForm] = useState<Partial<PromotionType>>(emptyType());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(type ? { ...type, defaults: { ...emptyType().defaults, ...type.defaults } } : emptyType());
  }, [open, type]);

  const d = form.defaults || {};
  const patchDefaults = (p: Partial<PromotionType["defaults"]>) => setForm((f) => ({ ...f, defaults: { ...f.defaults, ...p } }));
  const kind = form.kind || "voucher";

  const changeKind = (k: PromotionKind) => {
    const reward = k === "free_shipping" ? { type: "free_shipping" as const } : k === "bundle" ? { type: "bundle" as const, buyQty: 2, getQty: 1, getDiscountPercent: 100 } : { type: "percentage" as const, value: 10 };
    setForm((f) => ({ ...f, kind: k, defaults: { ...f.defaults, reward } }));
  };

  const submit = async () => {
    if (!form.name?.trim()) {
      setError("Give the preset a name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = type?._id ? `/api/admin/promotion-types/${type._id}` : "/api/admin/promotion-types";
      const res = await fetch(url, { method: type?._id ? "PUT" : "POST", headers: authHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save preset");
      onSaved(data.type);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preset");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle component="div" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" fontWeight={700} color="#0f172a">{type ? "Edit Promotion Type" : "New Promotion Type"}</Typography>
        <IconButton onClick={onClose} size="small" disabled={saving}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {type?.isSystem && <Alert severity="info">System preset: you can change its defaults or deactivate it, but not delete it.</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth required label="Preset name" value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Kind" value={kind} onChange={(e) => changeKind(e.target.value as PromotionKind)}>
              {PROMOTION_KINDS.map((k) => (
                <MenuItem key={k} value={k}>{PROMOTION_KIND_LABELS[k]}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="Description" value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Grid>
          {kind === "voucher" && (
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Default visibility" value={d.visibility || "public"} onChange={(e) => patchDefaults({ visibility: e.target.value as "public" | "private" })}>
                <MenuItem value="public">Public voucher</MenuItem>
                <MenuItem value="private">Private promo code</MenuItem>
              </TextField>
            </Grid>
          )}
          <Grid item xs={12} sm={6} sx={{ display: "flex", alignItems: "center" }}>
            <FormControlLabel control={<Switch checked={form.isActive !== false} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />} label="Available when creating promotions" />
          </Grid>
        </Grid>

        <Block title="Default reward"><RewardFields kind={kind} reward={d.reward || { type: "percentage" }} onChange={(reward) => patchDefaults({ reward })} /></Block>
        <Block title="Default scope">
          <ScopeFields
            scope={d.scope || { type: "all" }}
            onChange={(scope) => patchDefaults({ scope })}
            allowProducts={true}
            perProduct={d.perProduct || []}
            onPerProductChange={(perProduct) =>
              patchDefaults({
                perProduct,
                scope: { ...(d.scope || { type: "products" }), type: "products", productIds: perProduct.map((p) => p.productId) },
              })
            }
            rewardPercent={d.reward?.type === "percentage" ? d.reward.value : undefined}
          />
        </Block>
        <Block title="Default conditions"><ConditionsFields conditions={d.conditions || {}} onChange={(conditions) => patchDefaults({ conditions })} /></Block>
        <Block title="Default limits"><LimitsFields limits={d.limits || {}} stackable={d.stackable !== false} priority={d.priority || 0} onChange={(v) => patchDefaults(v)} /></Block>
        <Block title="Default badge" last><BadgeFields badge={d.badge || { label: "", color: "#dc2626" }} onChange={(badge) => patchDefaults({ badge })} /></Block>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ textTransform: "none", fontWeight: 700, backgroundColor: "#0284c7", color: "#fff", "&:hover": { backgroundColor: "#0369a1" } }}>
          {type ? "Save changes" : "Create preset"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Block({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} color="#334155" sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
      {!last && <Divider sx={{ mt: 2.5, borderColor: "#f1f5f9" }} />}
    </Box>
  );
}
