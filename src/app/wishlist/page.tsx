"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Box, Button, CircularProgress, Container, Grid, Typography } from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ProductCard, { type ProductCardData } from "@/app/components/ProductCard";
import { authFetch } from "@/lib/authFetch";
import { BRAND } from "@/lib/constants";
import { useWishlist } from "@/app/providers/WishlistProvider";

export default function WishlistPage() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { productIds, ready } = useWishlist();
  const visibleProducts = ready ? products.filter((product) => productIds.has(product._id)) : products;

  useEffect(() => {
    void (async () => {
      try {
        const res = await authFetch("/api/wishlist");
        const data = await res.json();
        if (!res.ok || !data.success) setError(data.message || "Please log in to view saved items");
        else setProducts(data.products || []);
      } catch {
        setError("Could not load saved items");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
    <Typography variant="h4" sx={{ color: BRAND.navy, fontWeight: 800, mb: 1 }}>My Wishlist</Typography>
    <Typography color="text.secondary" sx={{ mb: 4 }}>Items you saved for later.</Typography>
    {loading ? <Box sx={{ textAlign: "center", py: 8 }}><CircularProgress /></Box> : error ? <Alert severity="info" action={<Button component={Link} href="/login?next=/wishlist">Log in</Button>}>{error}</Alert> : visibleProducts.length === 0 ? <Box sx={{ textAlign: "center", py: 8 }}><FavoriteBorderIcon sx={{ fontSize: 48, color: "text.secondary" }} /><Typography sx={{ mt: 2, mb: 2 }}>Your wishlist is empty.</Typography><Button component={Link} href="/shop" variant="contained">Explore products</Button></Box> : <Grid container spacing={3}>{visibleProducts.map((product) => <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}><ProductCard product={product} /></Grid>)}</Grid>}
  </Container>;
}
