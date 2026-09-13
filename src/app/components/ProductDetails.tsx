"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Divider,
  Rating,
  TextField,
  Typography,
} from "@mui/material";
import { useCart } from "@/app/providers/CartProvider";
import { BRAND } from "@/lib/constants";
import Loader from "@/app/components/loader/Loader";
import { authHeaders } from "@/lib/cart";
import ProductImageGallery from "@/app/components/ProductImageGallery";
import { getProductImageUrls, getProductThumbnail } from "@/lib/productImages";
import { usePromotions } from "@/app/providers/PromotionProvider";
import PriceTag from "@/app/components/promotions/PriceTag";
import FlashSaleCountdown from "@/app/components/promotions/FlashSaleCountdown";
import VoucherStrip from "@/app/components/promotions/VoucherStrip";
import type { ProductReview } from "@/types/apps/productReviewTypes";

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
  const { dealFor } = usePromotions();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [myReview, setMyReview] = useState<ProductReview | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [draftRating, setDraftRating] = useState<number | null>(null);
  const [draftComment, setDraftComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const productId = Array.isArray(id) ? id[0] : id;

  const loadReviews = useCallback(async (pid: string) => {
    try {
      const res = await fetch(`/api/products/${pid}/reviews`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) return;
      setReviews(data.reviews || []);
      setMyReview(data.myReview || null);
      setCanReview(Boolean(data.canReview));
      setAverageRating(Number(data.averageRating) || 0);
      setReviewCount(Number(data.reviewCount) || 0);
      if (data.myReview) {
        setDraftRating(Number(data.myReview.rating) || null);
        setDraftComment(String(data.myReview.comment || ""));
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  }, []);

  useEffect(() => {
    setIsLoggedIn(Boolean(typeof window !== "undefined" && localStorage.getItem("token")));
  }, []);

  useEffect(() => {
    if (!productId) return;

    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${productId}`);
        const data = await res.json();
        if (data.success) {
          setProduct(data.product);
          setAverageRating(Number(data.product.rating) || 0);
        }
        await loadReviews(productId);
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [productId, loadReviews]);

  const handleSubmitReview = async () => {
    if (!productId || draftRating === null) {
      setReviewError("Please choose a star rating");
      return;
    }
    if (!isLoggedIn) {
      router.push(`/login?next=/products/${productId}`);
      return;
    }
    if (!canReview) {
      setReviewError("Unable to submit a review for this product.");
      return;
    }

    setSubmitting(true);
    setReviewError("");
    setReviewSuccess("");
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          rating: draftRating,
          comment: draftComment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setReviewError(data.message || data.error || "Could not submit review");
        return;
      }
      setReviews(data.reviews || []);
      setMyReview(data.myReview || null);
      setCanReview(Boolean(data.canReview ?? true));
      setAverageRating(Number(data.averageRating) || 0);
      setReviewCount(Number(data.reviewCount) || 0);
      setProduct((prev) =>
        prev ? { ...prev, rating: Number(data.averageRating) || prev.rating } : prev
      );
      setReviewSuccess(data.message || "Review saved");
    } catch {
      setReviewError("Network error submitting review");
    } finally {
      setSubmitting(false);
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
        category: product.category,
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
        category: product.category,
      },
      quantity
    );
    router.push("/checkout");
  };

  if (loading) {
    return <Loader size={180} message="Loading product details..." />;
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
        maxWidth: 1200,
        margin: "40px auto",
        padding: { xs: 2, md: 4 },
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: { xs: 3, md: 8 },
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
          {(() => {
            const deal = dealFor({ _id: product._id, price: Number(product.price) || 0, category: product.category });
            return (
              <Box sx={{ mt: 2 }}>
                <PriceTag
                  price={Number(product.price) || 0}
                  salePrice={deal?.salePrice}
                  badge={deal?.promotion.badge}
                  size="large"
                  suffix={<Typography component="span" sx={{ fontSize: "0.8rem", color: "text.secondary" }}>per piece</Typography>}
                />
                {deal?.promotion.kind === "flash_sale" && <FlashSaleCountdown endAt={deal.promotion.endAt} />}
              </Box>
            );
          })()}

          <VoucherStrip product={{ _id: product._id, price: Number(product.price) || 0, category: product.category }} />

          <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Rating value={averageRating} max={5} precision={0.5} readOnly />
            <Typography variant="body2" color="text.secondary">
              {averageRating.toFixed(1)} · {reviewCount} review{reviewCount === 1 ? "" : "s"}
            </Typography>
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
            <Button
              variant="outlined"
              onClick={() => setQuantity((prev) => Math.min(maxQty, prev + 1))}
              disabled={quantity >= maxQty}
            >
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

      <Box
        sx={{
          mt: 4,
          p: { xs: 3, md: 4 },
          backgroundColor: "#fff",
          borderRadius: 3,
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.navy, mb: 1 }}>
          Ratings & reviews
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Share your experience. One review per account, you can update it anytime.
        </Typography>

        {!isLoggedIn ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Link href={`/login?next=/products/${productId}`} style={{ fontWeight: 700, color: BRAND.navy }}>
              Log in
            </Link>{" "}
            to leave a rating and comment.
          </Alert>
        ) : canReview ? (
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              {myReview ? "Update your review" : "Write a review"}
            </Typography>
            <Rating
              value={draftRating}
              max={5}
              precision={0.5}
              onChange={(_, value) => setDraftRating(value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Comment (optional)"
              placeholder="What did you like or dislike?"
              value={draftComment}
              onChange={(e) => setDraftComment(e.target.value.slice(0, 1000))}
              fullWidth
              multiline
              minRows={3}
              helperText={`${draftComment.length}/1000`}
            />
            {reviewError ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {reviewError}
              </Alert>
            ) : null}
            {reviewSuccess ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                {reviewSuccess}
              </Alert>
            ) : null}
            <Button
              variant="contained"
              onClick={handleSubmitReview}
              disabled={submitting || draftRating === null}
              sx={{
                mt: 2,
                textTransform: "none",
                fontWeight: 700,
                backgroundColor: BRAND.navy,
              }}
            >
              {submitting ? "Saving…" : myReview ? "Update review" : "Submit review"}
            </Button>
          </Box>
        ) : null}

        <Divider sx={{ mb: 3 }} />

        {reviews.length === 0 ? (
          <Typography color="text.secondary">No reviews yet. Be the first to rate this product.</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {reviews.map((review) => (
              <Box
                key={review._id}
                sx={{
                  pb: 2,
                  borderBottom: "1px solid #e2e8f0",
                  "&:last-child": { borderBottom: "none", pb: 0 },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 700 }}>{review.userName}</Typography>
                  <Rating value={review.rating} max={5} precision={0.5} size="small" readOnly />
                  <Typography variant="caption" color="text.secondary">
                    {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}
                    {myReview?._id === review._id ? " · You" : ""}
                  </Typography>
                </Box>
                {review.comment ? (
                  <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.6, color: "text.primary" }}>
                    {review.comment}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", fontStyle: "italic" }}>
                    No written comment
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ProductDetails;
