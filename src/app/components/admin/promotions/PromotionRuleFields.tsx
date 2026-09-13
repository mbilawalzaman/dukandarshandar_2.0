"use client";

/**
 * Field groups shared by the promotion builder and the promotion-type (preset) editor.
 * Each group edits one slice of PromotionInput and stays presentation-only.
 */

import { useMemo, useState } from "react";
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import type {
  PromotionBadge,
  PromotionConditions,
  PromotionKind,
  PromotionLimits,
  PromotionProductDeal,
  PromotionReward,
  PromotionScope,
} from "@/types/apps/promotionTypes";
import PromotionBadgeChip from "@/app/components/promotions/PromotionBadge";

const numOrUndef = (v: string) => (v === "" ? undefined : Number(v));
const str = (v: number | undefined) => (v === undefined || v === null ? "" : String(v));

// ---------------------------------------------------------------------------
export function RewardFields({
  kind,
  reward,
  onChange,
}: {
  kind: PromotionKind;
  reward: PromotionReward;
  onChange: (next: PromotionReward) => void;
}) {
  const patch = (p: Partial<PromotionReward>) => onChange({ ...reward, ...p });

  if (kind === "free_shipping") {
    return (
      <Typography variant="body2" color="text.secondary">
        Reward: the delivery fee is waived automatically when the conditions below are met.
      </Typography>
    );
  }

  if (kind === "bundle") {
    return (
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <TextField fullWidth type="number" label="Buy quantity" value={str(reward.buyQty)} inputProps={{ min: 1 }} onChange={(e) => patch({ type: "bundle", buyQty: numOrUndef(e.target.value) })} />
        </Grid>
        <Grid item xs={4}>
          <TextField fullWidth type="number" label="Get quantity" value={str(reward.getQty)} inputProps={{ min: 1 }} onChange={(e) => patch({ type: "bundle", getQty: numOrUndef(e.target.value) })} />
        </Grid>
        <Grid item xs={4}>
          <TextField fullWidth type="number" label="Get at % off" value={str(reward.getDiscountPercent ?? 100)} inputProps={{ min: 1, max: 100 }} helperText="100 = free" onChange={(e) => patch({ type: "bundle", getDiscountPercent: numOrUndef(e.target.value) })} />
        </Grid>
      </Grid>
    );
  }

  const isVoucher = kind === "voucher";
  const isFlash = kind === "flash_sale";
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth select label="Reward type" value={reward.type} onChange={(e) => patch({ type: e.target.value as PromotionReward["type"] })}>
          <MenuItem value="percentage">Percentage off (%)</MenuItem>
          <MenuItem value="fixed">Fixed amount off (Rs.)</MenuItem>
          {isVoucher && <MenuItem value="free_shipping">Free delivery</MenuItem>}
        </TextField>
      </Grid>
      {reward.type !== "free_shipping" && (
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            label={reward.type === "percentage" ? "Percent off" : "Amount off (Rs.)"}
            value={str(reward.value)}
            inputProps={{ min: 0, max: reward.type === "percentage" ? 100 : undefined }}
            helperText={isFlash ? "Default for products without a sale price" : undefined}
            onChange={(e) => patch({ value: numOrUndef(e.target.value) })}
          />
        </Grid>
      )}
      {reward.type === "percentage" && (
        <Grid item xs={12} sm={4}>
          <TextField fullWidth type="number" label="Max discount (Rs.)" value={str(reward.maxDiscount)} inputProps={{ min: 0 }} onChange={(e) => patch({ maxDiscount: numOrUndef(e.target.value) })} />
        </Grid>
      )}
    </Grid>
  );
}

// ---------------------------------------------------------------------------
export function ConditionsFields({
  conditions,
  onChange,
}: {
  conditions: PromotionConditions;
  onChange: (next: PromotionConditions) => void;
}) {
  const patch = (p: Partial<PromotionConditions>) => onChange({ ...conditions, ...p });
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth type="number" label="Min. order amount (Rs.)" value={str(conditions.minOrderAmount)} inputProps={{ min: 0 }} onChange={(e) => patch({ minOrderAmount: numOrUndef(e.target.value) })} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField fullWidth type="number" label="Min. qualifying items" value={str(conditions.minItemQuantity)} inputProps={{ min: 0 }} onChange={(e) => patch({ minItemQuantity: numOrUndef(e.target.value) })} />
      </Grid>
      <Grid item xs={12} sm={4} sx={{ display: "flex", alignItems: "center" }}>
        <FormControlLabel control={<Switch checked={Boolean(conditions.firstOrderOnly)} onChange={(e) => patch({ firstOrderOnly: e.target.checked })} />} label="First order only" />
      </Grid>
    </Grid>
  );
}

// ---------------------------------------------------------------------------
export function LimitsFields({
  limits,
  stackable,
  priority,
  onChange,
}: {
  limits: PromotionLimits;
  stackable: boolean;
  priority: number;
  onChange: (next: { limits: PromotionLimits; stackable: boolean; priority: number }) => void;
}) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={3}>
        <TextField fullWidth type="number" label="Total uses" value={str(limits.totalUses)} inputProps={{ min: 0 }} helperText="Blank = unlimited" onChange={(e) => onChange({ limits: { ...limits, totalUses: numOrUndef(e.target.value) }, stackable, priority })} />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField fullWidth type="number" label="Uses per customer" value={str(limits.perCustomer)} inputProps={{ min: 0 }} helperText="Blank = unlimited" onChange={(e) => onChange({ limits: { ...limits, perCustomer: numOrUndef(e.target.value) }, stackable, priority })} />
      </Grid>
      <Grid item xs={12} sm={3}>
        <TextField fullWidth type="number" label="Priority" value={String(priority)} helperText="Higher wins on a product" onChange={(e) => onChange({ limits, stackable, priority: Number(e.target.value) || 0 })} />
      </Grid>
      <Grid item xs={12} sm={3} sx={{ display: "flex", alignItems: "center" }}>
        <FormControlLabel control={<Switch checked={stackable} onChange={(e) => onChange({ limits, stackable: e.target.checked, priority })} />} label="Stackable" />
      </Grid>
    </Grid>
  );
}

import ProductPicker from "./ProductPicker";

import SearchIcon from "@mui/icons-material/Search";
import { InputAdornment } from "@mui/material";

export function SearchableCategorySelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return PRODUCT_CATEGORIES;
    return PRODUCT_CATEGORIES.filter((c) => c.toLowerCase().includes(search.trim().toLowerCase()));
  }, [search]);

  return (
    <FormControl fullWidth>
      <InputLabel>Categories</InputLabel>
      <Select
        multiple
        value={selected}
        onChange={(e) => {
          const v = e.target.value;
          onChange(typeof v === "string" ? v.split(",") : v);
        }}
        input={<OutlinedInput label="Categories" />}
        renderValue={(sel) => (sel as string[]).join(", ")}
        MenuProps={{ autoFocus: false }}
      >
        <Box sx={{ p: 1, position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1, borderBottom: "1px solid #e2e8f0" }} onKeyDown={(e) => e.stopPropagation()}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        {filtered.map((cat) => (
          <MenuItem key={cat} value={cat}>
            <Checkbox checked={selected.includes(cat)} />
            <ListItemText primary={cat} />
          </MenuItem>
        ))}
        {filtered.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No categories found
            </Typography>
          </MenuItem>
        )}
      </Select>
    </FormControl>
  );
}

// ---------------------------------------------------------------------------
export function ScopeFields({
  scope,
  onChange,
  allowProducts = true,
  perProduct = [],
  onPerProductChange,
  withPricing = false,
  rewardPercent,
}: {
  scope: PromotionScope;
  onChange: (next: PromotionScope) => void;
  allowProducts?: boolean;
  perProduct?: PromotionProductDeal[];
  onPerProductChange?: (next: PromotionProductDeal[]) => void;
  withPricing?: boolean;
  rewardPercent?: number;
}) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={scope.type === "categories" ? 4 : 12}>
        <TextField fullWidth select label="Applies to" value={scope.type} onChange={(e) => onChange({ ...scope, type: e.target.value as PromotionScope["type"] })}>
          <MenuItem value="all">All products</MenuItem>
          <MenuItem value="categories">Specific categories</MenuItem>
          {allowProducts && <MenuItem value="products">Selected products</MenuItem>}
        </TextField>
      </Grid>
      {scope.type === "categories" && (
        <Grid item xs={12} sm={8}>
          <SearchableCategorySelect
            selected={scope.categories || []}
            onChange={(categories) => onChange({ ...scope, categories })}
          />
        </Grid>
      )}
      {scope.type === "products" && onPerProductChange && (
        <Grid item xs={12}>
          <ProductPicker
            value={perProduct}
            onChange={(deals) => {
              onPerProductChange(deals);
              onChange({ ...scope, productIds: deals.map((d) => d.productId) });
            }}
            withPricing={withPricing}
            defaultPercent={rewardPercent}
          />
        </Grid>
      )}
    </Grid>
  );
}

// ---------------------------------------------------------------------------
export function BadgeFields({ badge, onChange }: { badge: PromotionBadge; onChange: (next: PromotionBadge) => void }) {
  return (
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={12} sm={5}>
        <TextField
          fullWidth
          label="Badge label"
          placeholder="e.g. -20%, Flash Sale"
          value={badge.label || ""}
          helperText="Leave blank to use discount value"
          onChange={(e) => onChange({ ...badge, label: e.target.value })}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <TextField
          fullWidth
          type="color"
          label="Badge colour"
          value={badge.color || "#dc2626"}
          InputLabelProps={{ shrink: true }}
          inputProps={{ style: { height: 38, padding: 4, cursor: "pointer" } }}
          onChange={(e) => onChange({ ...badge, color: e.target.value })}
        />
      </Grid>
      <Grid item xs={6} sm={4}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Preview
          </Typography>
          <PromotionBadgeChip badge={{ label: badge.label || "Sample Badge", color: badge.color || "#dc2626" }} size="medium" />
        </Box>
      </Grid>
    </Grid>
  );
}

