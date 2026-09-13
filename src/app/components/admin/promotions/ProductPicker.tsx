"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import { getProductThumbnail } from "@/lib/productImages";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import type { PromotionProductDeal } from "@/types/apps/promotionTypes";
import type { ProductCardData } from "@/app/components/ProductCard";

type Props = {
  value: PromotionProductDeal[];
  onChange: (next: PromotionProductDeal[]) => void;
  /** show sale price / stock limit columns (product_discount, flash_sale) */
  withPricing: boolean;
  /** percentage used by "apply % to all" */
  defaultPercent?: number;
};

/** Browseable catalog picker with category dropdown filter, search box, and deal price editor. */
export default function ProductPicker({ value, onChange, withPricing, defaultPercent }: Props) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [catalog, setCatalog] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkPercent, setBulkPercent] = useState<string>(defaultPercent ? String(defaultPercent) : "");

  const selectedMap = useMemo(() => {
    const map = new Map<string, PromotionProductDeal>();
    value.forEach((d) => map.set(d.productId, d));
    return map;
  }, [value]);

  // Fetch catalog on mount or when category / search changes
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("limit", "100");
        if (query.trim()) params.set("search", query.trim());
        if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);

        const res = await fetch(`/api/products?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          setCatalog(data.products);
        }
      } catch {
        /* aborted or failed */
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, selectedCategory]);

  const toggleProduct = (p: ProductCardData) => {
    if (selectedMap.has(p._id)) {
      onChange(value.filter((d) => d.productId !== p._id));
    } else {
      const original = Number(p.price) || 0;
      const pct = Number(bulkPercent) || Number(defaultPercent) || 0;
      const salePrice = pct > 0 ? Math.round(original * (1 - pct / 100)) : original;
      onChange([
        ...value,
        {
          productId: p._id,
          productName: p.name,
          originalPrice: original,
          salePrice,
          sold: 0,
        },
      ]);
    }
  };

  const selectAllVisible = () => {
    const nextMap = new Map(selectedMap);
    const pct = Number(bulkPercent) || Number(defaultPercent) || 0;
    catalog.forEach((p) => {
      if (!nextMap.has(p._id)) {
        const original = Number(p.price) || 0;
        nextMap.set(p._id, {
          productId: p._id,
          productName: p.name,
          originalPrice: original,
          salePrice: pct > 0 ? Math.round(original * (1 - pct / 100)) : original,
          sold: 0,
        });
      }
    });
    onChange(Array.from(nextMap.values()));
  };

  const deselectAllVisible = () => {
    const visibleIds = new Set(catalog.map((p) => p._id));
    onChange(value.filter((d) => !visibleIds.has(d.productId)));
  };

  const updateDeal = (id: string, patch: Partial<PromotionProductDeal>) =>
    onChange(value.map((d) => (d.productId === id ? { ...d, ...patch } : d)));

  const removeDeal = (id: string) => onChange(value.filter((d) => d.productId !== id));

  const applyBulkPercent = () => {
    const pct = Number(bulkPercent);
    if (!(pct > 0 && pct <= 100)) return;
    onChange(value.map((d) => ({ ...d, salePrice: Math.round((d.originalPrice || 0) * (1 - pct / 100)) })));
  };

  const allVisibleSelected = catalog.length > 0 && catalog.every((p) => selectedMap.has(p._id));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* ---------------- Filter Toolbar ---------------- */}
      <Grid container spacing={1.5} alignItems="center">
        <Grid item xs={12} sm={7}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search products by name or code..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {loading ? <CircularProgress size={16} /> : <SearchIcon sx={{ color: "#94a3b8" }} />}
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={5}>
          <TextField
            fullWidth
            select
            size="small"
            label="Filter by category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="all">All Categories ({catalog.length})</MenuItem>
            {PRODUCT_CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {/* ---------------- Browse Catalog List ---------------- */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", borderColor: "#cbd5e1" }}>
        <Box sx={{ p: 1.5, bg: "#f8fafc", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              size="small"
              onClick={allVisibleSelected ? deselectAllVisible : selectAllVisible}
              sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.8rem" }}
              startIcon={allVisibleSelected ? <CheckBoxIcon fontSize="small" color="primary" /> : <CheckBoxOutlineBlankIcon fontSize="small" />}
            >
              {allVisibleSelected ? "Deselect visible" : "Select all visible"}
            </Button>
            <Typography variant="caption" color="text.secondary">
              Showing {catalog.length} products
            </Typography>
          </Box>
          <Chip label={`${value.length} selected`} size="small" color={value.length > 0 ? "primary" : "default"} sx={{ fontWeight: 700 }} />
        </Box>

        <List dense disablePadding sx={{ maxHeight: 240, overflowY: "auto" }}>
          {loading && catalog.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : catalog.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No products found. Try changing your search query or category filter.
              </Typography>
            </Box>
          ) : (
            catalog.map((p) => {
              const isSelected = selectedMap.has(p._id);
              return (
                <ListItemButton key={p._id} onClick={() => toggleProduct(p)} selected={isSelected} sx={{ borderBottom: "1px solid #f1f5f9" }}>
                  <Checkbox checked={isSelected} edge="start" size="small" />
                  <ListItemAvatar>
                    <Avatar variant="rounded" src={getProductThumbnail(p)} alt={p.name} sx={{ width: 36, height: 36 }} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="body2" fontWeight={isSelected ? 700 : 500}>{p.name}</Typography>}
                    secondary={
                      <Box component="span" sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.25 }}>
                        <Chip label={p.category || "Uncategorized"} size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
                        <Typography variant="caption" color="text.secondary">PKR {Number(p.price).toLocaleString()}</Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              );
            })
          )}
        </List>
      </Paper>

      {/* ---------------- Selected Deal Pricing Table ---------------- */}
      {value.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="subtitle2" fontWeight={700} color="#334155">
              Selected Products Pricing ({value.length})
            </Typography>
            {withPricing && (
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TextField size="small" type="number" label="% off to all" value={bulkPercent} inputProps={{ min: 1, max: 100 }} onChange={(e) => setBulkPercent(e.target.value)} sx={{ width: 130 }} />
                <Button size="small" variant="outlined" onClick={applyBulkPercent} sx={{ textTransform: "none" }}>
                  Apply
                </Button>
              </Box>
            )}
          </Box>

          <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: "auto" }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: "#f8fafc" }}>
                <TableRow>
                  <TableCell><Typography variant="caption" fontWeight={700}>Product</Typography></TableCell>
                  <TableCell align="right"><Typography variant="caption" fontWeight={700}>Base Price</Typography></TableCell>
                  {withPricing && <TableCell align="right"><Typography variant="caption" fontWeight={700}>Sale Price (Rs.)</Typography></TableCell>}
                  {withPricing && <TableCell align="right"><Typography variant="caption" fontWeight={700}>Stock Limit</Typography></TableCell>}
                  <TableCell align="center" sx={{ width: 48 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {value.map((d) => (
                  <TableRow key={d.productId}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{d.productName || d.productId}</Typography>
                      {d.sold > 0 && <Typography variant="caption" color="text.secondary">{d.sold} sold</Typography>}
                    </TableCell>
                    <TableCell align="right">PKR {(d.originalPrice || 0).toLocaleString()}</TableCell>
                    {withPricing && (
                      <TableCell align="right">
                        <TextField size="small" type="number" value={d.salePrice} inputProps={{ min: 0, style: { textAlign: "right" } }} onChange={(e) => updateDeal(d.productId, { salePrice: Number(e.target.value) || 0 })} sx={{ width: 110 }} />
                      </TableCell>
                    )}
                    {withPricing && (
                      <TableCell align="right">
                        <TextField size="small" type="number" placeholder="∞" value={d.stockLimit ?? ""} inputProps={{ min: 0, style: { textAlign: "right" } }} onChange={(e) => updateDeal(d.productId, { stockLimit: e.target.value === "" ? undefined : Number(e.target.value) })} sx={{ width: 90 }} />
                      </TableCell>
                    )}
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => removeDeal(d.productId)} sx={{ color: "#ef4444" }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}
    </Box>
  );
}

