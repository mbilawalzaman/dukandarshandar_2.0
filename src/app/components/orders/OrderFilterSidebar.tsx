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
  InputAdornment,
  IconButton,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import TuneIcon from "@mui/icons-material/Tune";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import FilterListIcon from "@mui/icons-material/FilterList";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { BRAND } from "@/lib/constants";

export interface OrderFilterState {
  search: string;
  status: string;
  timeframe: string;
  sortBy: string;
}

interface OrderFilterSidebarProps {
  filters: OrderFilterState;
  onFilterChange: <K extends keyof OrderFilterState>(key: K, value: OrderFilterState[K]) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  statusCounts: Record<string, number>;
  totalOrders: number;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Orders", color: "default" as const },
  { value: "pending", label: "Pending", color: "warning" as const },
  { value: "processing", label: "Processing", color: "info" as const },
  { value: "shipped", label: "Shipped", color: "primary" as const },
  { value: "delivered", label: "Delivered", color: "success" as const },
  { value: "cancelled", label: "Cancelled", color: "error" as const },
];

const TIMEFRAME_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "30days", label: "Last 30 Days" },
  { value: "3months", label: "Last 3 Months" },
  { value: "6months", label: "Last 6 Months" },
  { value: "thisYear", label: "This Year" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "amount_desc", label: "Amount: High to Low" },
  { value: "amount_asc", label: "Amount: Low to High" },
];

export default function OrderFilterSidebar({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
  statusCounts,
  totalOrders,
}: OrderFilterSidebarProps) {
  const { search, status, timeframe, sortBy } = filters;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TuneIcon sx={{ color: BRAND.navy, fontSize: 22 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND.navy, fontSize: "1.05rem" }}>
            Filter Orders
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

      {/* Search Input */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, mb: 1, display: "block" }}>
          Search Orders
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="Order ID, product name..."
          value={search}
          onChange={(e) => onFilterChange("search", e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => onFilterChange("search", "")}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              backgroundColor: "#f8fafc",
              fontSize: "0.9rem",
            },
          }}
        />
      </Box>

      {/* Status Filter */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, mb: 1, display: "block" }}>
          Order Status
        </Typography>
        <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = status === opt.value;
            const count = opt.value === "all" ? totalOrders : (statusCounts[opt.value] || 0);

            return (
              <ListItemButton
                key={opt.value}
                selected={isSelected}
                onClick={() => onFilterChange("status", opt.value)}
                sx={{
                  borderRadius: 2,
                  py: 0.75,
                  px: 1.5,
                  "&.Mui-selected": {
                    backgroundColor: "#fffbeb",
                    color: BRAND.navy,
                    fontWeight: 700,
                    borderLeft: `3px solid ${BRAND.gold}`,
                  },
                }}
              >
                <ListItemText
                  primary={opt.label}
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    fontWeight: isSelected ? 700 : 500,
                  }}
                />
                <Chip
                  label={count}
                  size="small"
                  variant={isSelected ? "filled" : "outlined"}
                  color={opt.color}
                  sx={{
                    height: 20,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Divider />

      {/* Timeframe Filter */}
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
          <AccessTimeIcon sx={{ fontSize: 16, color: "#64748b" }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Time Period
          </Typography>
        </Box>
        <RadioGroup
          value={timeframe}
          onChange={(e) => onFilterChange("timeframe", e.target.value)}
        >
          {TIMEFRAME_OPTIONS.map((opt) => (
            <FormControlLabel
              key={opt.value}
              value={opt.value}
              control={<Radio size="small" sx={{ py: 0.5 }} />}
              label={<Typography variant="body2" sx={{ fontSize: "0.875rem" }}>{opt.label}</Typography>}
            />
          ))}
        </RadioGroup>
      </Box>

      <Divider />

      {/* Sort By */}
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
          <FilterListIcon sx={{ fontSize: 16, color: "#64748b" }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Sort By
          </Typography>
        </Box>
        <RadioGroup
          value={sortBy}
          onChange={(e) => onFilterChange("sortBy", e.target.value)}
        >
          {SORT_OPTIONS.map((opt) => (
            <FormControlLabel
              key={opt.value}
              value={opt.value}
              control={<Radio size="small" sx={{ py: 0.5 }} />}
              label={<Typography variant="body2" sx={{ fontSize: "0.875rem" }}>{opt.label}</Typography>}
            />
          ))}
        </RadioGroup>
      </Box>
    </Box>
  );
}
