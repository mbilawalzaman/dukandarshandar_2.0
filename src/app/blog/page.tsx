"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
} from "@mui/material";
import PageBanner from "../components/PageBanner";
import ProductCard, { type ProductCardData } from "../components/ProductCard";
import { PRICE_FILTERS, PRODUCT_CATEGORIES } from "@/lib/constants";

export default function BlogPage() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [minPrice, setMinPrice] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (data.success) setProducts(data.products || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = category === "all" || product.category?.toLowerCase() === category.toLowerCase();
      const priceMatch = Number(product.price) > minPrice;
      return categoryMatch && priceMatch;
    });
  }, [products, category, minPrice]);

  return (
    <Box>
      <PageBanner title="Blog Section" subtitle="Featured finds, tips, and shop highlights" />
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={3}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Product filters
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Price</InputLabel>
              <Select value={minPrice} label="Price" onChange={(e) => setMinPrice(Number(e.target.value))}>
                {PRICE_FILTERS.map((price) => (
                  <MenuItem key={price} value={price}>
                    {price === 0 ? "All prices" : `Greater than PKR ${price}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={9}>
            <Grid container spacing={3}>
              {loading
                ? [...Array(6)].map((_, i) => (
                    <Grid item xs={12} sm={6} md={4} key={i}>
                      <Skeleton variant="rectangular" height={280} />
                    </Grid>
                  ))
                : filtered.length === 0
                  ? (
                    <Grid item xs={12}>
                      <Typography color="text.secondary">No products match these filters.</Typography>
                    </Grid>
                  )
                  : filtered.map((product) => (
                      <Grid item xs={12} sm={6} md={4} key={product._id}>
                        <ProductCard product={product} />
                      </Grid>
                    ))}
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
