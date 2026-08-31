"use client";

import { useEffect, useState } from "react";
import { Grid, Typography, Skeleton, Container } from "@mui/material";
import ProductCard, { type ProductCardData } from "./ProductCard";
import { BRAND } from "@/lib/constants";

interface TopRatedProductsProps {
  refreshTrigger?: boolean;
  count?: number;
}

export default function TopRatedProducts({ refreshTrigger = false, count = 4 }: TopRatedProductsProps) {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/top-rated?limit=${count}`);
        const data = await response.json();
        const list = Array.isArray(data) ? data : data.products || [];
        setProducts(list.slice(0, count));
      } catch (error) {
        console.error("Error fetching top-rated products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTopProducts();
  }, [refreshTrigger, count]);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
      <Typography variant="h4" sx={{ textAlign: "center", mb: 4, fontWeight: 800, color: BRAND.navy }}>
        Top Searches & Highly Rated
      </Typography>
      <Grid container spacing={3}>
        {loading
          ? [...Array(count)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={count === 4 ? 3 : 4} key={index}>
                <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 3 }} />
              </Grid>
            ))
          : products.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={count === 4 ? 3 : 4} key={product._id}>
                <ProductCard product={product} />
              </Grid>
            ))}
      </Grid>
    </Container>
  );
}
