"use client";

import { Card, CardMedia, CardContent, CardActions, Typography, Button, Rating, Box } from "@mui/material";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/providers/CartProvider";

export type ProductCardData = {
  _id: string;
  name: string;
  category?: string;
  price: number;
  rating?: number;
  image?: string;
  quantity?: number;
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
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        transition: "transform 0.2s ease",
        "&:hover": { transform: "translateY(-4px)" },
      }}
    >
      <CardMedia
        component="img"
        height="200"
        image={product.image || "/images/logo.jpg"}
        alt={product.name}
        sx={{ objectFit: "cover", cursor: "pointer" }}
        onClick={() => router.push(`/products/${product._id}`)}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h6" component="div" sx={{ fontSize: "1.05rem" }}>
          {product.name}
        </Typography>
        {product.category && (
          <Typography variant="body2" color="text.secondary">
            {product.category}
          </Typography>
        )}
        <Typography variant="body1" color="primary" sx={{ fontWeight: 700, mt: 0.5 }}>
          PKR {Number(product.price).toLocaleString()}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
          <Rating value={Number(product.rating) || 0} max={5} precision={0.5} readOnly size="small" />
          <Typography variant="caption">{(Number(product.rating) || 0).toFixed(1)}</Typography>
        </Box>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button size="small" onClick={() => router.push(`/products/${product._id}`)}>
          View Details
        </Button>
        <Button
          size="small"
          variant="contained"
          disabled={outOfStock}
          onClick={() => add({ _id: product._id, name: product.name, price: product.price, image: product.image }, 1)}
        >
          {outOfStock ? "Out of Stock" : "Add to Cart"}
        </Button>
      </CardActions>
    </Card>
  );
}
