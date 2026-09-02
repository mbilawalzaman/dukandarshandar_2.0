"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Grid,
  Typography,
  Box,
  Skeleton,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  Button,
  Drawer,
  IconButton,
  Container,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import ProductCard, { type ProductCardData } from "./ProductCard";
import FilterSidebar, { type FilterState } from "./catalog/FilterSidebar";
import { BRAND } from "@/lib/constants";

interface ProductListProps {
  refreshTrigger?: boolean;
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
  productsPerPage?: number;
}

const initialFilters: FilterState = {
  searchInput: "",
  category: "all",
  minPrice: "",
  maxPrice: "",
  inStockOnly: false,
  sortBy: "default",
};

export default function ProductList({
  refreshTrigger = false,
  title = "All Products",
  subtitle,
  hideHeader = false,
  productsPerPage = 9,
}: ProductListProps) {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({ all: 0 });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const perPage = productsPerPage > 0 ? productsPerPage : 9;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.searchInput), 300);
    return () => clearTimeout(timer);
  }, [filters.searchInput]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(perPage),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (filters.category !== "all") params.set("category", filters.category);
      if (filters.minPrice !== "") params.set("minPrice", filters.minPrice);
      if (filters.maxPrice !== "") params.set("maxPrice", filters.maxPrice);
      if (filters.inStockOnly) params.set("inStockOnly", "true");
      if (filters.sortBy !== "default") params.set("sortBy", filters.sortBy);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProducts(
          (data.products || []).map((product: ProductCardData) => ({
            ...product,
            price: Number(product.price) || 0,
            quantity: Number(product.quantity) || 0,
            rating: Number(product.rating) || 0,
            description: product.description || "",
          }))
        );
        setTotal(data.pagination?.total ?? 0);
        setTotalPages(data.pagination?.totalPages ?? 1);
        if (data.categoryCounts) setCategoryCounts(data.categoryCounts);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch, filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, refreshTrigger]);

  const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(filters.searchInput) ||
    filters.category !== "all" ||
    filters.minPrice !== "" ||
    filters.maxPrice !== "" ||
    filters.inStockOnly ||
    filters.sortBy !== "default";

  const showingFrom = total === 0 ? 0 : (page - 1) * perPage + 1;
  const showingTo = Math.min(page * perPage, total);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
      {!hideHeader && (
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: BRAND.navy }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      )}

      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          p: 1.5,
          backgroundColor: "#fff",
          borderRadius: 2,
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
        }}
      >
        <Button
          variant="outlined"
          startIcon={<TuneIcon />}
          onClick={() => setMobileDrawerOpen(true)}
          sx={{ textTransform: "none", fontWeight: 600, borderColor: "#cbd5e1" }}
        >
          Filters {hasActiveFilters && "• Active"}
        </Button>
        <Typography variant="body2" color="text.secondary">
          {total} {total === 1 ? "product" : "products"}
        </Typography>
      </Box>

      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        PaperProps={{ sx: { width: "85%", maxWidth: 340, p: 3 } }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          <IconButton onClick={() => setMobileDrawerOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <FilterSidebar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          categoryCounts={categoryCounts}
        />
        <Button
          variant="contained"
          fullWidth
          onClick={() => setMobileDrawerOpen(false)}
          sx={{ mt: 3, fontWeight: 700 }}
        >
          View {total} Results
        </Button>
      </Drawer>

      <Grid container spacing={4}>
        <Grid item xs={12} md={3.5} lg={3} sx={{ display: { xs: "none", md: "block" } }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              position: "sticky",
              top: 88,
            }}
          >
            <FilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              onReset={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
              categoryCounts={categoryCounts}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={8.5} lg={9}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2,
              mb: 3,
              pb: 2,
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.navy }}>
                {filters.category === "all" ? "All Products" : filters.category}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Showing {showingFrom}–{showingTo} of {total} items
              </Typography>
            </Box>

            <FormControl size="small" sx={{ minWidth: 180, width: { xs: "100%", sm: "auto" } }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={filters.sortBy}
                label="Sort By"
                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              >
                <MenuItem value="default">Default / Featured</MenuItem>
                <MenuItem value="price-asc">Price: Low to High</MenuItem>
                <MenuItem value="price-desc">Price: High to Low</MenuItem>
                <MenuItem value="rating-desc">Highest Rated</MenuItem>
                <MenuItem value="name-asc">Name: A to Z</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {hasActiveFilters && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
              {filters.searchInput && (
                <Chip
                  label={`Search: "${filters.searchInput}"`}
                  onDelete={() => handleFilterChange("searchInput", "")}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {filters.category !== "all" && (
                <Chip
                  label={`Category: ${filters.category}`}
                  onDelete={() => handleFilterChange("category", "all")}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {filters.minPrice !== "" && (
                <Chip
                  label={`Min: PKR ${filters.minPrice}`}
                  onDelete={() => handleFilterChange("minPrice", "")}
                  size="small"
                  variant="outlined"
                />
              )}
              {filters.maxPrice !== "" && (
                <Chip
                  label={`Max: PKR ${filters.maxPrice}`}
                  onDelete={() => handleFilterChange("maxPrice", "")}
                  size="small"
                  variant="outlined"
                />
              )}
              {filters.inStockOnly && (
                <Chip
                  label="In Stock Only"
                  onDelete={() => handleFilterChange("inStockOnly", false)}
                  size="small"
                  variant="outlined"
                />
              )}
              <Chip
                label="Clear All"
                onClick={handleResetFilters}
                size="small"
                sx={{ cursor: "pointer", fontWeight: 600 }}
              />
            </Box>
          )}

          <Grid container spacing={3}>
            {loading ? (
              [...Array(6)].map((_, index) => (
                <Grid item xs={12} sm={6} md={6} lg={4} key={index}>
                  <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 3 }} />
                </Grid>
              ))
            ) : products.length === 0 ? (
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 6,
                    textAlign: "center",
                    borderRadius: 3,
                    border: "1px dashed #cbd5e1",
                    backgroundColor: "#fafafa",
                  }}
                >
                  <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                    No products matched your criteria
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Try removing some filters or search for another keyword.
                  </Typography>
                  <Button variant="contained" onClick={handleResetFilters} size="small">
                    Reset Filters
                  </Button>
                </Paper>
              </Grid>
            ) : (
              products.map((product) => (
                <Grid item xs={12} sm={6} md={6} lg={4} key={product._id}>
                  <ProductCard product={product} />
                </Grid>
              ))
            )}
          </Grid>

          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, val) => {
                  setPage(val);
                  window.scrollTo({ top: 350, behavior: "smooth" });
                }}
                color="primary"
                shape="rounded"
                size="large"
              />
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
