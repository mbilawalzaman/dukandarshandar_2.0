"use client";

import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Rating,
  Box,
  Chip,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/providers/CartProvider";
import { getProductThumbnail } from "@/lib/productImages";

export type ProductCardData = {
  _id: string;
  name: string;
  category?: string;
  price: number;
  rating?: number;
  image?: string;
  images?: { url: string; publicId?: string }[];
  quantity?: number;
  description?: string;
};

export default function ProductCard({ product }: { product: ProductCardData }) {
  const router = useRouter();
  const { add } = useCart();
  const outOfStock = Number(product.quantity) === 0;

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        border: "1px solid #e2e8f0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        overflow: "hidden",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 12px 24px rgba(0,0,0,0.08)",
          borderColor: "#cbd5e1",
          "& .product-img": {
            transform: "scale(1.06)",
          },
        },
      }}
    >
      {/* Product Image Frame */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: 190,
          backgroundColor: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          cursor: "pointer",
          overflow: "hidden",
        }}
        onClick={() => router.push(`/products/${product._id}`)}
      >
        <Box
          component="img"
          className="product-img"
          src={getProductThumbnail(product)}
          alt={product.name}
          sx={{
            maxHeight: "100%",
            maxWidth: "100%",
            objectFit: "contain",
            transition: "transform 0.3s ease",
          }}
        />
        {outOfStock && (
          <Chip
            label="Out of Stock"
            size="small"
            color="error"
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              fontWeight: 600,
              fontSize: "0.75rem",
            }}
          />
        )}
      </Box>

      {/* Product Information */}
      <CardContent sx={{ flexGrow: 1, p: 2, pb: 1, display: "flex", flexDirection: "column" }}>
        {product.category && (
          <Typography
            variant="caption"
            sx={{
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "text.secondary",
              fontWeight: 600,
              mb: 0.5,
            }}
          >
            {product.category}
          </Typography>
        )}

        <Typography
          variant="subtitle1"
          component="h3"
          onClick={() => router.push(`/products/${product._id}`)}
          sx={{
            fontWeight: 600,
            fontSize: "0.95rem",
            lineHeight: 1.35,
            cursor: "pointer",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: "2.7rem",
            "&:hover": { color: "primary.main" },
          }}
        >
          {product.name}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1, mb: 1 }}>
          <Rating value={Number(product.rating) || 0} max={5} precision={0.5} readOnly size="small" />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            ({(Number(product.rating) || 0).toFixed(1)})
          </Typography>
        </Box>

        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: 700,
            fontSize: "1.05rem",
            color: "#0f172a",
            mt: "auto",
            pt: 0.5,
          }}
        >
          PKR {Number(product.price).toLocaleString()}
        </Typography>
      </CardContent>

      {/* Action Buttons */}
      <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          fullWidth
          onClick={() => router.push(`/products/${product._id}`)}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          Details
        </Button>
        <Button
          size="small"
          variant="contained"
          color="primary"
          fullWidth
          disabled={outOfStock}
          onClick={() =>
            add(
              {
                _id: product._id,
                name: product.name,
                price: product.price,
                image: getProductThumbnail(product),
              },
              1
            )
          }
          sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}
        >
          {outOfStock ? "Out of Stock" : "Add to Cart"}
        </Button>
      </CardActions>
    </Card>
  );
}
