"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
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
  Paper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import { authHeaders } from "@/lib/cart";
import {
  PROMOTION_KIND_LABELS,
  PROMOTION_KINDS,
  type Promotion,
  type PromotionInput,
  type PromotionKind,
  type PromotionType,
} from "@/types/apps/promotionTypes";
import { conditionsLabel, rewardLabel, scopeLabel } from "@/lib/promotionDisplay";
import { toDateInputValue } from "@/lib/dateUtils";
import PromotionBadge from "@/app/components/promotions/PromotionBadge";
import PriceTag from "@/app/components/promotions/PriceTag";
import { BadgeFields, ConditionsFields, LimitsFields, RewardFields, ScopeFields } from "./PromotionRuleFields";

type Props = {
  open: boolean;
  onClose: () => void;
  promotion: Promotion | null;
  /** preselect kind when creating (e.g. from the Vouchers tab) */
  defaultKind?: PromotionKind;
  onSaved: (saved: Promotion) => void;
};

const todayPlus = (days: number) => toDateInputValue(new Date(Date.now() + days * 86400000));

function emptyForm(kind: PromotionKind): PromotionInput {
  return {
    name: "",
    description: "",
    kind,
    typeId: null,
    code: "",
    visibility: kind === "voucher" ? "public" : "public",
    isDraft: false,
    isPaused: false,
    startAt: todayPlus(0),
    endAt: todayPlus(30),
    scope: { type: kind === "flash_sale" ? "products" : "all", categories: [], productIds: [] },
    conditions: {},
    reward: kind === "free_shipping" ? { type: "free_shipping" } : kind === "bundle" ? { type: "bundle", buyQty: 2, getQty: 1, getDiscountPercent: 100 } : { type: "percentage", value: 10 },
    perProduct: [],
    limits: kind === "voucher" ? { perCustomer: 1 } : {},
    stackable: kind === "voucher" || kind === "free_shipping",
    priority: 0,
    badge: { label: "", color: "#dc2626" },
  };
}

function usesProductPricing(kind?: PromotionKind) {
  return kind === "product_discount" || kind === "flash_sale";
}

/** Streamlined 1-step promotion campaign launcher with preset rule inheritance. */
export default function PromotionFormModal({ open, onClose, promotion, defaultKind = "voucher", onSaved }: Props) {
  const [form, setForm] = useState<PromotionInput>(emptyForm(defaultKind));
  const [types, setTypes] = useState<PromotionType[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const patch = (p: Partial<PromotionInput>) => setForm((f) => ({ ...f, ...p }));
  const kind = form.kind || "voucher";

  const applyTypeById = (id: string, availableTypes: PromotionType[]) => {
    setSelectedType(id);
    const t = availableTypes.find((x) => x._id === id);
    if (!t) return;
    const base = emptyForm(t.kind);
    const d = t.defaults || {};
    setForm((f) => ({
      ...base,
      name: f.name || "",
      description: f.description || t.description || "",
      code: f.code || "",
      isPaused: Boolean(f.isPaused),
      isDraft: Boolean(f.isDraft),
      typeId: t._id,
      kind: t.kind,
      visibility: d.visibility || base.visibility,
      scope: d.scope ? { ...d.scope } : base.scope,
      conditions: d.conditions ? { ...d.conditions } : base.conditions,
      reward: d.reward ? { ...d.reward } : base.reward,
      limits: d.limits ? { ...d.limits } : base.limits,
      perProduct: d.perProduct ? [...d.perProduct] : [],
      stackable: d.stackable ?? base.stackable,
      priority: d.priority ?? base.priority,
      badge: d.badge ? { ...d.badge } : base.badge,
      startAt: f.startAt || base.startAt,
      endAt: f.endAt || base.endAt,
    }));
  };

  const applyType = (id: string) => applyTypeById(id, types);

  useEffect(() => {
    if (!open) return;
    let isCancelled = false;
    setError("");
    setSelectedType("");
    setShowAdvanced(false);

    if (promotion) {
      setForm({
        ...promotion,
        startAt: toDateInputValue(promotion.startAt),
        endAt: toDateInputValue(promotion.endAt),
        code: promotion.code || "",
      });
      if (promotion.typeId) setSelectedType(promotion.typeId);
    } else {
      setForm(emptyForm(defaultKind));
    }

    fetch("/api/admin/promotion-types", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (isCancelled) return;
        if (d.success && Array.isArray(d.types)) {
          setTypes(d.types);
          if (!promotion && d.types.length > 0) {
            const match = d.types.find((t: PromotionType) => t.kind === defaultKind) || d.types[0];
            if (match && match._id) {
              applyTypeById(match._id, d.types);
            }
          }
        }
      })
      .catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, [open, promotion, defaultKind]);

  const changeKind = (next: PromotionKind) => {
    const base = emptyForm(next);
    setForm((f) => ({ ...base, name: f.name, description: f.description, startAt: f.startAt, endAt: f.endAt, visibility: f.visibility, badge: f.badge }));
  };

  const validateForm = (): string => {
    if (!form.name?.trim()) return "Give the promotion a name.";
    if (kind === "voucher" && !form.code?.trim()) return "Vouchers need a promo code.";
    if (form.startAt && form.endAt && form.startAt > form.endAt) return "End date must be after start date.";
    const r = form.reward;
    if (kind !== "free_shipping" && kind !== "bundle" && r?.type !== "free_shipping" && !(Number(r?.value) > 0) && !usesProductPricing(kind)) {
      return "Enter a valid discount reward value.";
    }
    if (form.scope?.type === "categories" && !form.scope.categories?.length) return "Pick at least one category.";
    if (form.scope?.type === "products" && !form.perProduct?.length) return "Select at least one product.";
    return "";
  };

  const submit = async (asDraft: boolean) => {
    const err = validateForm();
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: PromotionInput = {
        ...form,
        isDraft: asDraft,
        code: kind === "voucher" ? (form.code || "").trim().toUpperCase() : null,
        scope: { ...form.scope!, productIds: form.scope?.type === "products" ? (form.perProduct || []).map((d) => d.productId) : [] },
        perProduct: form.scope?.type === "products" ? form.perProduct : [],
        badge: form.badge?.label ? form.badge : undefined,
      };
      const url = promotion?._id ? `/api/admin/promotions/${promotion._id}` : "/api/admin/promotions";
      const res = await fetch(url, { method: promotion?._id ? "PUT" : "POST", headers: authHeaders(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save promotion");
      onSaved(data.promotion);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save promotion");
    } finally {
      setSaving(false);
    }
  };

  const samplePrice = useMemo(() => form.perProduct?.[0]?.originalPrice || 1000, [form.perProduct]);
  const sampleSale = useMemo(() => {
    const r = form.reward;
    if (form.perProduct?.[0]) return form.perProduct[0].salePrice;
    if (r?.type === "percentage" && r.value) return Math.round(samplePrice * (1 - Math.min(100, r.value) / 100));
    if (r?.type === "fixed" && r.value) return Math.max(0, samplePrice - r.value);
    return samplePrice;
  }, [form.reward, form.perProduct, samplePrice]);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle component="div" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h6" fontWeight={700} color="#0f172a">
            {promotion ? "Edit Promotion" : "Create Promotion Campaign"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {PROMOTION_KIND_LABELS[kind]}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" disabled={saving}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* ---------------- 1. Discount Strategy Preset Selector ---------------- */}
        {!promotion && types.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, backgroundColor: "#f8fafc", borderColor: "#cbd5e1" }}>
            <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ mb: 1 }}>
              1. Select Discount Rule Preset
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={7}>
                <TextField fullWidth select size="small" label="Discount Type / Rule Preset" value={selectedType} onChange={(e) => applyType(e.target.value)}>
                  <MenuItem value="">Custom / Blank Strategy</MenuItem>
                  {types.map((t) => (
                    <MenuItem key={t._id} value={t._id}>
                      {t.name} ({PROMOTION_KIND_LABELS[t.kind]})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={5}>
                {selectedType && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    <Chip label={`Reward: ${rewardLabel(form.reward)}`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                    <Chip label={`Applies to: ${scopeLabel(form.scope)}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* ---------------- 2. Core Campaign Fields ---------------- */}
        <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
          2. Campaign Details & Schedule
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth required label="Campaign Name" placeholder="e.g. 14 August Independence Sale" value={form.name || ""} onChange={(e) => patch({ name: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Promotion Kind" value={kind} disabled={Boolean(promotion)} onChange={(e) => changeKind(e.target.value as PromotionKind)}>
              {PROMOTION_KINDS.map((k) => (
                <MenuItem key={k} value={k}>{PROMOTION_KIND_LABELS[k]}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {kind === "voucher" && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label="Voucher Code" placeholder="e.g. INDEP2026" value={form.code || ""} onChange={(e) => patch({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} inputProps={{ maxLength: 30 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Visibility" value={form.visibility || "public"} onChange={(e) => patch({ visibility: e.target.value as "public" | "private" })}>
                  <MenuItem value="public">Public Voucher (shown on store)</MenuItem>
                  <MenuItem value="private">Private Promo Code (hidden)</MenuItem>
                </TextField>
              </Grid>
            </>
          )}

          <Grid item xs={6}>
            <TextField fullWidth type="date" label="Start Date" InputLabelProps={{ shrink: true }} value={form.startAt || ""} onChange={(e) => patch({ startAt: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth type="date" label="End Date" InputLabelProps={{ shrink: true }} value={form.endAt || ""} onChange={(e) => patch({ endAt: e.target.value })} helperText="Runs until 23:59 PST on this day" />
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="Terms & Conditions / Description" placeholder="Optional notes or customer-facing promo terms..." value={form.description || ""} onChange={(e) => patch({ description: e.target.value })} />
          </Grid>

          <Grid item xs={12}>
            <BadgeFields badge={form.badge || { label: "", color: "#dc2626" }} onChange={(badge) => patch({ badge })} />
          </Grid>
        </Grid>

        {/* ---------------- 3. Live Preview Card ---------------- */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderStyle: "dashed", backgroundColor: "#fafafa" }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            STOREFRONT PREVIEW
          </Typography>
          <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <PromotionBadge badge={{ label: form.badge?.label || rewardLabel(form.reward) || "Deal", color: form.badge?.color || "#dc2626" }} size="medium" />
            {usesProductPricing(kind) && <PriceTag price={samplePrice} salePrice={sampleSale} size="medium" />}
            {kind === "voucher" && form.code && (
              <Chip label={`Voucher: ${form.code} (${rewardLabel(form.reward)})`} sx={{ fontWeight: 700, backgroundColor: "#dcfce7", color: "#166534" }} />
            )}
            <Typography variant="caption" color="text.secondary">
              Conditions: {conditionsLabel(form.conditions)}
            </Typography>
          </Box>
        </Paper>

        {/* ---------------- 4. Advanced Rules Accordion ---------------- */}
        <Accordion expanded={showAdvanced} onChange={(_e, exp) => setShowAdvanced(exp)} variant="outlined" sx={{ borderRadius: "8px !important", borderColor: "#cbd5e1" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TuneIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" fontWeight={700}>
                Customize Rules & Products (Advanced)
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
            <Section title="Reward Configuration">
              <RewardFields kind={kind} reward={form.reward || { type: "percentage" }} onChange={(reward) => patch({ reward })} />
            </Section>

            <Section title="Product Scope & Selection">
              <ScopeFields
                scope={form.scope || { type: "all" }}
                onChange={(scope) => patch({ scope })}
                perProduct={form.perProduct || []}
                onPerProductChange={(perProduct) => patch({ perProduct })}
                withPricing={usesProductPricing(kind)}
                rewardPercent={form.reward?.type === "percentage" ? form.reward.value : undefined}
              />
            </Section>

            <Section title="Conditions">
              <ConditionsFields conditions={form.conditions || {}} onChange={(conditions) => patch({ conditions })} />
            </Section>

            <Section title="Limits & Stacking">
              <LimitsFields limits={form.limits || {}} stackable={form.stackable !== false} priority={form.priority || 0} onChange={(v) => patch(v)} />
            </Section>
          </AccordionDetails>
        </Accordion>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
        <FormControlLabel control={<Switch checked={Boolean(form.isPaused)} onChange={(e) => patch({ isPaused: e.target.checked })} />} label="Start paused" />
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" disabled={saving} onClick={() => submit(true)} sx={{ textTransform: "none" }}>
            Save as draft
          </Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => submit(false)}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: "none", fontWeight: 700, backgroundColor: "#0284c7", color: "#fff", "&:hover": { backgroundColor: "#0369a1" } }}
          >
            {promotion ? "Save changes" : "Publish Campaign"}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} color="#334155" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {children}
      <Divider sx={{ mt: 2.5, borderColor: "#f1f5f9" }} />
    </Box>
  );
}

