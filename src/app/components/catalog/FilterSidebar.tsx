"use client";

import React from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import TuneIcon from "@mui/icons-material/Tune";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { BRAND, PRODUCT_CATEGORIES } from "@/lib/constants";

export interface FilterState {
  searchInput: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  inStockOnly: boolean;
  sortBy: string;
}

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  categoryCounts: Record<string, number>;
}

export default function FilterSidebar({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
  categoryCounts,
}: FilterSidebarProps) {
  const { searchInput, category, minPrice, maxPrice, inStockOnly } = filters;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Header with Title and Reset */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TuneIcon sx={{ color: BRAND.navy, fontSize: 22 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND.navy, fontSize: "1.1rem" }}>
            Filter Products
          </Typography>
        </Box>
        {hasActiveFilters && (
          <Button
            size="small"
            startIcon={<RestartAltIcon />}
            onClick={onReset}
            sx={{
              textTransform: "none",
              color: "text.secondary",
              fontSize: "0.8rem",
              "&:hover": { color: "error.main" },
            }}
          >
            Reset
          </Button>
        )}
      </Box>

      <Divider />

      {/* Live Search */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#1e293b" }}>
          Search
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search products..."
          value={searchInput}
          onChange={(e) => onFilterChange("searchInput", e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: searchInput ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => onFilterChange("searchInput", "")}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Box>

      {/* Categories with Count Badges */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#1e293b" }}>
          Categories
        </Typography>
        <List dense disablePadding sx={{ borderRadius: 2, overflow: "hidden" }}>
          <ListItemButton
            selected={category === "all"}
            onClick={() => onFilterChange("category", "all")}
            sx={{
              borderRadius: 1.5,
              mb: 0.5,
              py: 0.75,
              "&.Mui-selected": {
                backgroundColor: "rgba(254, 190, 76, 0.18)",
                fontWeight: 700,
                color: "#92400e",
                "&:hover": { backgroundColor: "rgba(254, 190, 76, 0.28)" },
              },
            }}
          >
            <ListItemText
              primary="All Categories"
              primaryTypographyProps={{ fontSize: "0.9rem", fontWeight: category === "all" ? 700 : 500 }}
            />
            <Chip
              label={categoryCounts.all || 0}
              size="small"
              sx={{ height: 20, fontSize: "0.75rem", backgroundColor: category === "all" ? BRAND.gold : "#f1f5f9" }}
            />
          </ListItemButton>

          {PRODUCT_CATEGORIES.map((cat) => {
            const isSelected = category.toLowerCase() === cat.toLowerCase();
            const count = categoryCounts[cat] || 0;
            return (
              <ListItemButton
                key={cat}
                selected={isSelected}
                onClick={() => onFilterChange("category", cat)}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  py: 0.75,
                  "&.Mui-selected": {
                    backgroundColor: "rgba(254, 190, 76, 0.18)",
                    fontWeight: 700,
                    color: "#92400e",
                    "&:hover": { backgroundColor: "rgba(254, 190, 76, 0.28)" },
                  },
                }}
              >
                <ListItemText
                  primary={cat}
                  primaryTypographyProps={{ fontSize: "0.9rem", fontWeight: isSelected ? 700 : 500 }}
                />
                <Chip
                  label={count}
                  size="small"
                  sx={{ height: 20, fontSize: "0.75rem", backgroundColor: isSelected ? BRAND.gold : "#f1f5f9" }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      {/* Price Range & Quick Presets */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "#1e293b" }}>
          Price Range (PKR)
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            size="small"
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => onFilterChange("minPrice", e.target.value)}
            inputProps={{ min: 0 }}
            sx={{ flex: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            –
          </Typography>
          <TextField
            size="small"
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => onFilterChange("maxPrice", e.target.value)}
            inputProps={{ min: 0 }}
            sx={{ flex: 1 }}
          />
        </Box>
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 1.5 }}>
          {[
            { label: "< 500", max: "500" },
            { label: "< 1000", max: "1000" },
            { label: "< 2000", max: "2000" },
          ].map((preset) => (
            <Chip
              key={preset.label}
              label={preset.label}
              size="small"
              clickable
              variant={maxPrice === preset.max ? "filled" : "outlined"}
              color={maxPrice === preset.max ? "primary" : "default"}
              onClick={() => onFilterChange("maxPrice", maxPrice === preset.max ? "" : preset.max)}
              sx={{ fontSize: "0.75rem" }}
            />
          ))}
        </Box>
      </Box>

      {/* Availability */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: "#1e293b" }}>
          Availability
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={inStockOnly}
              onChange={(e) => onFilterChange("inStockOnly", e.target.checked)}
              size="small"
            />
          }
          label={<Typography variant="body2">In stock only</Typography>}
        />
      </Box>
    </Box>
  );
}
