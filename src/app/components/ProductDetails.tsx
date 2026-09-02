"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, Typography, Button, CircularProgress, Rating } from "@mui/material";
import { useCart } from "@/app/providers/CartProvider";
import { BRAND } from "@/lib/constants";
import ProductImageGallery from "@/app/components/ProductImageGallery";
import { getProductImageUrls, getProductThumbnail } from "@/lib/productImages";

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  rating: number;
  ratings: number[];
  image: string;
  images?: { url: string; publicId?: string }[];
  description: string;
}

const ProductDetails = () => {
  const { id } = useParams();
  const router = useRouter();
  const { add } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [userRating, setUserRating] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        if (data.success) {
          setProduct(data.product);
          setUserRating(Number(data.product.rating) || 0);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  const handleRatingChange = async (newValue: number | null) => {
    if (!product || newValue === null) return;
    const roundedRating = Math.round(newValue * 2) / 2;
    setUserRating(roundedRating);

    try {
      const res = await fetch("/api/products/updateProduct", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: product._id, rating: roundedRating }),
      });
      const data = await res.json();
      if (data.success && data.product) {
        setProduct(data.product);
        setUserRating(data.product.rating);
      }
    } catch (error) {
      console.error("Error updating rating:", error);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    add(
      {
        _id: product._id,
        name: product.name,
        price: product.price,
        image: getProductThumbnail(product),
      },
      quantity
    );
  };

  const handleBuyNow = () => {
    if (!product) return;
    add(
      {
        _id: product._id,
        name: product.name,
        price: product.price,
        image: getProductThumbnail(product),
      },
      quantity
    );
    router.push("/checkout");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!product) {
    return (
      <Typography variant="h6" color="error" sx={{ textAlign: "center", mt: 8 }}>
        Product not found.
      </Typography>
    );
  }

  const maxQty = Math.max(1, Number(product.quantity) || 1);
  const outOfStock = Number(product.quantity) <= 0;
  const galleryImages = getProductImageUrls(product);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: { xs: 3, md: 8 },
        maxWidth: 1200,
        margin: "40px auto",
        padding: { xs: 3, md: 6 },
        backgroundColor: "#fff",
        borderRadius: 3,
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}
    >
      <Box>
        <ProductImageGallery images={galleryImages} alt={product.name} />
      </Box>

      <Box>
        <Typography variant="h4" sx={{ color: BRAND.navy }}>
          {product.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Category: {product.category}
        </Typography>
        <Typography variant="h5" sx={{ mt: 2, fontWeight: 800 }}>
          PKR {Number(product.price).toLocaleString()}
          <Typography component="sup" sx={{ ml: 1, fontSize: "0.8rem", color: "text.secondary" }}>
            per piece
          </Typography>
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Rating value={userRating} max={5} precision={0.5} onChange={(_, newValue) => handleRatingChange(newValue)} />
        </Box>

        <Typography variant="body1" sx={{ mt: 2, lineHeight: 1.7 }}>
          {product.description ?? "No description available"}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", mt: 3, gap: 1 }}>
          <Typography>Quantity:</Typography>
          <Button variant="outlined" onClick={() => setQuantity((prev) => Math.max(1, prev - 1))} disabled={quantity <= 1}>
            -
          </Button>
          <Typography sx={{ minWidth: 32, textAlign: "center", fontWeight: 700 }}>{quantity}</Typography>
          <Button variant="outlined" onClick={() => setQuantity((prev) => Math.min(maxQty, prev + 1))} disabled={quantity >= maxQty}>
            +
          </Button>
        </Box>

        {outOfStock && (
          <Typography color="error" sx={{ mt: 1 }}>
            Out of stock
          </Typography>
        )}

        <Box sx={{ mt: 4, display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
          <Button
            onClick={handleBuyNow}
            variant="contained"
            disabled={outOfStock}
            fullWidth
            sx={{ py: 1.4, backgroundColor: BRAND.goldHover, color: "#fff", "&:hover": { backgroundColor: BRAND.goldDark } }}
          >
            Buy Now
          </Button>
          <Button onClick={handleAddToCart} variant="outlined" disabled={outOfStock} fullWidth sx={{ py: 1.4 }}>
            Add to Cart
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ProductDetails;
