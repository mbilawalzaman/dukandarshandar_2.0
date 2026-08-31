"use client";

import { useEffect, useState } from "react";
import {
  Grid,
  Typography,
  Box,
  Skeleton,
  TextField,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import ProductCard, { type ProductCardData } from "./ProductCard";
import { PRODUCT_CATEGORIES } from "@/lib/constants";

const ProductList = ({ refreshTrigger }: { refreshTrigger: boolean }) => {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const productsPerPage = 8;

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

  const filteredProducts = products.filter((product) => {
    const searchMatch = product.name.toLowerCase().includes(searchInput.toLowerCase());
    const maxPrice = Number(priceFilter);
    const priceMatch = priceFilter === "" || (!isNaN(maxPrice) && product.price <= maxPrice);
    const categoryMatch = category === "all" || product.category?.toLowerCase() === category.toLowerCase();
    return searchMatch && priceMatch && categoryMatch;
  });

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice((page - 1) * productsPerPage, page * productsPerPage);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ textAlign: "center", mb: 4 }}>
        All Products
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 4,
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <TextField
          label="Search by product name"
          variant="outlined"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          sx={{ width: { xs: "100%", sm: 280 } }}
        />
        <FormControl sx={{ width: { xs: "100%", sm: 180 } }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={category}
            label="Category"
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="all">All</MenuItem>
            {PRODUCT_CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Max price"
          type="number"
          variant="outlined"
          value={priceFilter}
          onChange={(e) => {
            setPriceFilter(e.target.value);
            setPage(1);
          }}
          slotProps={{ htmlInput: { min: 0 } }}
          sx={{ width: { xs: "100%", sm: 160 } }}
        />
      </Box>

      <Grid container spacing={3}>
        {loading
          ? [...Array(8)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Skeleton variant="rectangular" height={320} />
              </Grid>
            ))
          : paginatedProducts.length === 0
            ? (
              <Grid item xs={12} sx={{ textAlign: "center", py: 8 }}>
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  No products found
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {priceFilter || searchInput || category !== "all"
                    ? "Try adjusting your filters or search terms"
                    : "Check back later for new arrivals!"}
                </Typography>
              </Grid>
            )
            : paginatedProducts.map((product) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
                  <ProductCard product={product} />
                </Grid>
              ))}
      </Grid>

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" />
        </Box>
      )}
    </Box>
  );
};

export default ProductList;
