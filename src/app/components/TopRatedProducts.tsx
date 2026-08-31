"use client";

import { useEffect, useState } from "react";
import { Grid, Typography, Box, Skeleton } from "@mui/material";
import ProductCard, { type ProductCardData } from "./ProductCard";

export default function TopRatedProducts({ refreshTrigger }: { refreshTrigger: boolean }) {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        const response = await fetch("/api/products/top-rated");
        const data = await response.json();
        const list = Array.isArray(data) ? data : data.products || [];
        setProducts(list);
      } catch (error) {
        console.error("Error fetching top-rated products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTopProducts();
  }, [refreshTrigger]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ textAlign: "center", mb: 4 }}>
        Top Searches
      </Typography>
      <Grid container spacing={3}>
        {loading
          ? [...Array(4)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Skeleton variant="rectangular" height={320} />
              </Grid>
            ))
          : products.length > 0
            ? products.map((product) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
                  <ProductCard product={product} />
                </Grid>
              ))
            : (
              <Grid item xs={12}>
                <Typography variant="body1" sx={{ textAlign: "center" }}>
                  No products found.
                </Typography>
              </Grid>
            )}
      </Grid>
    </Box>
  );
}
