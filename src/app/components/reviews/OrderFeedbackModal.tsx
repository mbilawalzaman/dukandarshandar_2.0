"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Rating,
  TextField,
  Button,
  Chip,
  Alert,
  IconButton,
  Card,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { BRAND } from "@/lib/constants";
import { authHeaders } from "@/lib/cart";
import Loader from "@/app/components/loader/Loader";

export interface OrderItemReviewState {
  _id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  review: {
    rating: number;
    comment: string;
    updatedAt: string;
  } | null;
}

export interface OrderFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string | null;
  onReviewSubmitted?: () => void;
}

const QUICK_TAGS = [
  "Excellent Quality",
  "Fast Shipping",
  "Great Value",
  "Beautiful Packaging",
  "Highly Recommended",
];

export default function OrderFeedbackModal({
  open,
  onClose,
  orderId,
  onReviewSubmitted,
}: OrderFeedbackModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderDisplayId, setOrderDisplayId] = useState("");
  const [isDelivered, setIsDelivered] = useState(true);
  const [items, setItems] = useState<OrderItemReviewState[]>([]);

  // Local draft states per product ID
  const [draftRatings, setDraftRatings] = useState<Record<string, number>>({});
  const [draftComments, setDraftComments] = useState<Record<string, string>>({});
  const [submittingPid, setSubmittingPid] = useState<string | null>(null);
  const [itemMessage, setItemMessage] = useState<{ pid: string; text: string; severity: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!open || !orderId) return;

    let active = true;
    setLoading(true);
    setError("");
    setItemMessage(null);

    fetch(`/api/orders/${orderId}/reviews`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success) {
          setOrderDisplayId(data.orderDisplayId || orderId.slice(-8).toUpperCase());
          setIsDelivered(data.isDelivered ?? true);
          setItems(data.items || []);

          // Initialize draft states from existing reviews
          const initialRatings: Record<string, number> = {};
          const initialComments: Record<string, string> = {};
          (data.items || []).forEach((item: OrderItemReviewState) => {
            if (item.review) {
              initialRatings[item._id] = item.review.rating;
              initialComments[item._id] = item.review.comment || "";
            } else {
              initialRatings[item._id] = 5; // Default 5 stars
              initialComments[item._id] = "";
            }
          });
          setDraftRatings(initialRatings);
          setDraftComments(initialComments);
        } else {
          setError(data.message || "Failed to load order items for feedback.");
        }
      })
      .catch(() => {
        if (active) setError("Network error loading feedback items.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, orderId]);

  const handleChipClick = (pid: string, tag: string) => {
    const current = draftComments[pid] || "";
    if (current.includes(tag)) return;
    const updated = current ? `${current}. ${tag}` : tag;
    setDraftComments((prev) => ({ ...prev, [pid]: updated.slice(0, 1000) }));
  };

  const handleSubmitItemReview = async (pid: string) => {
    if (!orderId || !pid) return;

    const rating = draftRatings[pid] || 5;
    const comment = draftComments[pid] || "";

    setSubmittingPid(pid);
    setItemMessage(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          productId: pid,
          rating,
          comment,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setItemMessage({ pid, text: data.message || "Review submitted successfully!", severity: "success" });
        if (Array.isArray(data.items)) {
          setItems(data.items);
        }
        if (onReviewSubmitted) onReviewSubmitted();
      } else {
        setItemMessage({ pid, text: data.message || "Failed to submit review.", severity: "error" });
      }
    } catch {
      setItemMessage({ pid, text: "Network error submitting review.", severity: "error" });
    } finally {
      setSubmittingPid(null);
    }
  };

  const reviewedCount = items.filter((i) => i.review !== null).length;
  const allReviewed = items.length > 0 && reviewedCount === items.length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          m: 0,
          p: 2.5,
          backgroundColor: BRAND.navy,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <StarOutlineIcon sx={{ color: BRAND.gold, fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.2 }}>
              Rate & Review Products
            </Typography>
            <Typography variant="caption" sx={{ color: BRAND.gold, fontWeight: 600 }}>
              Order #{orderDisplayId} • Daraz & Alibaba Style Feedback
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "#ffffff" }} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 }, backgroundColor: "#f8fafc" }}>
        {!!submittingPid && <Loader overlay message="Submitting feedback..." />}
        {loading ? (
          <Loader size={160} message="Loading your delivered products…" />
        ) : error ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        ) : !isDelivered ? (
          <Alert severity="warning" sx={{ my: 2 }}>
            This order has not been marked as delivered yet. You can rate products once your package arrives!
          </Alert>
        ) : items.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            No items found in this order.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Delivery Confirmation Banner */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: "#ecfdf5",
                border: "1px solid #a7f3d0",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <LocalShippingOutlinedIcon sx={{ color: "#059669", fontSize: 24 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#065f46" }}>
                  Order Delivered Successfully
                </Typography>
                <Typography variant="caption" sx={{ color: "#047857" }}>
                  Please rate each product to help other buyers on Dukandar Shandar. ({reviewedCount}/{items.length} reviewed)
                </Typography>
              </Box>
            </Box>

            {/* Product Items List */}
            {items.map((item) => {
              const pid = item._id;
              const hasReviewed = item.review !== null;
              const currentRating = draftRatings[pid] ?? 5;
              const currentComment = draftComments[pid] ?? "";
              const isSubmitting = submittingPid === pid;
              const msg = itemMessage?.pid === pid ? itemMessage : null;

              return (
                <Card
                  key={pid}
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 2.5,
                    backgroundColor: "#ffffff",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
                    borderColor: hasReviewed ? "#cbd5e1" : BRAND.gold,
                  }}
                >
                  <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                    {/* Image */}
                    <Box
                      sx={{
                        width: 70,
                        height: 70,
                        borderRadius: 2,
                        backgroundColor: "#f1f5f9",
                        position: "relative",
                        overflow: "hidden",
                        flexShrink: 0,
                        border: "1px solid #e2e8f0",
                        p: 0.5,
                      }}
                    >
                      <Image
                        src={item.image || "/images/ds-icon.png"}
                        alt={item.name}
                        fill
                        style={{ objectFit: "contain", padding: 4 }}
                        unoptimized
                      />
                    </Box>

                    {/* Details */}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, flexWrap: "wrap" }}>
                        <Typography
                          component={pid ? Link : "p"}
                          href={pid ? `/products/${pid}` : "#"}
                          variant="subtitle1"
                          sx={{
                            fontWeight: 700,
                            color: BRAND.navy,
                            textDecoration: "none",
                            "&:hover": pid ? { color: "primary.main", textDecoration: "underline" } : {},
                          }}
                        >
                          {item.name}
                        </Typography>

                        <Chip
                          icon={hasReviewed ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : undefined}
                          label={hasReviewed ? "Reviewed" : "To Review"}
                          color={hasReviewed ? "success" : "warning"}
                          size="small"
                          sx={{ fontWeight: 700, height: 24, fontSize: "0.75rem" }}
                        />
                      </Box>

                      <Typography variant="caption" color="text.secondary">
                        Qty: {item.quantity} • PKR {Number(item.price).toLocaleString()}
                      </Typography>

                      {/* Interactive Rating Picker */}
                      <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: BRAND.navy }}>
                          Rating:
                        </Typography>
                        <Rating
                          value={currentRating}
                          precision={0.5}
                          max={5}
                          onChange={(_, val) => {
                            if (val !== null) {
                              setDraftRatings((prev) => ({ ...prev, [pid]: val }));
                            }
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: BRAND.navy }}>
                          {currentRating.toFixed(1)} / 5
                        </Typography>
                      </Box>

                      {/* Quick Tag Chips */}
                      <Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                        {QUICK_TAGS.map((tag) => (
                          <Chip
                            key={tag}
                            label={`+ ${tag}`}
                            size="small"
                            onClick={() => handleChipClick(pid, tag)}
                            sx={{
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              backgroundColor: currentComment.includes(tag) ? "rgba(15, 23, 42, 0.1)" : "#f1f5f9",
                              color: BRAND.navy,
                              "&:hover": { backgroundColor: "#e2e8f0" },
                            }}
                          />
                        ))}
                      </Box>

                      {/* Comment Box */}
                      <TextField
                        placeholder="Write your feedback about product quality, packaging, or delivery..."
                        value={currentComment}
                        onChange={(e) =>
                          setDraftComments((prev) => ({ ...prev, [pid]: e.target.value.slice(0, 1000) }))
                        }
                        fullWidth
                        multiline
                        minRows={2}
                        size="small"
                        sx={{ mt: 1.5 }}
                        helperText={`${currentComment.length}/1000`}
                      />

                      {/* Message Alert */}
                      {msg && (
                        <Alert severity={msg.severity} sx={{ mt: 1, py: 0.5 }}>
                          {msg.text}
                        </Alert>
                      )}

                      {/* Submit Action Button */}
                      <Box sx={{ mt: 1.5, display: "flex", justifyContent: "flex-end" }}>
                        <Button
                          variant="contained"
                          size="small"
                          disabled={isSubmitting || !pid}
                          onClick={() => handleSubmitItemReview(pid)}
                          sx={{
                            backgroundColor: BRAND.navy,
                            color: "#ffffff",
                            fontWeight: 700,
                            textTransform: "none",
                            px: 2.5,
                            py: 0.8,
                            "&:hover": { backgroundColor: "#1e293b" },
                          }}
                        >
                          {isSubmitting ? "Submitting…" : hasReviewed ? "Update Review" : "Submit Review"}
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </Card>
              );
            })}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, backgroundColor: "#ffffff" }}>
        <Button
          onClick={onClose}
          variant={allReviewed ? "contained" : "outlined"}
          sx={{
            fontWeight: 700,
            textTransform: "none",
            backgroundColor: allReviewed ? BRAND.goldHover : undefined,
            color: allReviewed ? "#ffffff" : BRAND.navy,
            "&:hover": allReviewed ? { backgroundColor: BRAND.goldDark } : undefined,
          }}
        >
          {allReviewed ? "Done & Close" : "Close"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
