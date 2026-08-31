"use client";

import { useEffect, useState, useMemo } from "react";
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
}: ProductListProps) {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [page, setPage] = useState(1);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const productsPerPage = 9;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/products");
        const data = await res.json();
        if (data.success) {
          setProducts(
            (data.products || []).map((product: ProductCardData) => ({
              ...product,
              price: Number(product.price) || 0,
              quantity: Number(product.quantity) || 0,
              rating: Number(product.rating) || 0,
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [refreshTrigger]);

  const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setPage(1);
  };

  // Dynamic category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach((p) => {
      const cat = p.category || "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    let list = [...products];
    const { searchInput, category, minPrice, maxPrice, inStockOnly, sortBy } = filters;

    if (searchInput.trim()) {
      const q = searchInput.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          (p as any).description?.toLowerCase().includes(q)
      );
    }

    if (category !== "all") {
      list = list.filter((p) => p.category?.toLowerCase() === category.toLowerCase());
    }

    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (minPrice !== "" && !isNaN(min)) {
      list = list.filter((p) => p.price >= min);
    }
    if (maxPrice !== "" && !isNaN(max)) {
      list = list.filter((p) => p.price <= max);
    }

    if (inStockOnly) {
      list = list.filter((p) => Number(p.quantity) > 0);
    }

    switch (sortBy) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating-desc":
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return list;
  }, [products, filters]);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * productsPerPage;
    return filteredProducts.slice(start, start + productsPerPage);
  }, [filteredProducts, page]);

  const hasActiveFilters =
    Boolean(filters.searchInput) ||
    filters.category !== "all" ||
    filters.minPrice !== "" ||
    filters.maxPrice !== "" ||
    filters.inStockOnly ||
    filters.sortBy !== "default";

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

      {/* Mobile Trigger */}
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
          {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
        </Typography>
      </Box>

      {/* Mobile Drawer */}
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
          View {filteredProducts.length} Results
        </Button>
      </Drawer>

      {/* Main Grid: Sidebar + Products */}
      <Grid container spacing={4}>
        {/* Left Sidebar on Desktop */}
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

        {/* Products Listing Area */}
        <Grid item xs={12} md={8.5} lg={9}>
          {/* Toolbar */}
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
                Showing {paginatedProducts.length > 0 ? (page - 1) * productsPerPage + 1 : 0}–
                {Math.min(page * productsPerPage, filteredProducts.length)} of {filteredProducts.length} items
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

          {/* Active Chips */}
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

          {/* Cards Grid */}
          <Grid container spacing={3}>
            {loading ? (
              [...Array(6)].map((_, index) => (
                <Grid item xs={12} sm={6} md={6} lg={4} key={index}>
                  <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 3 }} />
                </Grid>
              ))
            ) : paginatedProducts.length === 0 ? (
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
              paginatedProducts.map((product) => (
                <Grid item xs={12} sm={6} md={6} lg={4} key={product._id}>
                  <ProductCard product={product} />
                </Grid>
              ))
            )}
          </Grid>

          {/* Pagination */}
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
