"use client";

import { Box, Typography } from "@mui/material";

import { BRAND } from "@/lib/uiBrand";

type DeliveryShippingLineProps = {
  shipping: number;
  isPromo: boolean;
  standardFee?: number;
  rawFee?: number;
  discount?: number;
  discountApplied?: boolean;
  label?: string;
};

export default function DeliveryShippingLine({
  shipping,
  isPromo,
  standardFee = 0,
  rawFee,
  discount = 0,
  discountApplied = false,
  label = "Shipping Fee",
}: DeliveryShippingLineProps) {
  const displayRawFee = rawFee ?? standardFee;

  const showDiscount =
    discountApplied && displayRawFee > shipping && discount > 0;

  return (
    <Box sx={{ mb: 1.5 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography color="text.secondary">{label}</Typography>
        {isPromo ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {displayRawFee > 0 && (
              <Typography
                variant="body2"
                sx={{
                  color: "text.disabled",
                  textDecoration: "line-through",
                  fontWeight: 500,
                }}
              >
                PKR {displayRawFee.toLocaleString()}
              </Typography>
            )}
            <Typography sx={{ fontWeight: 800, color: BRAND.goldDark }}>
              FREE
            </Typography>
          </Box>
        ) : showDiscount ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: "text.disabled",
                textDecoration: "line-through",
                fontWeight: 500,
              }}
            >
              PKR {displayRawFee.toLocaleString()}
            </Typography>
            <Typography sx={{ fontWeight: 700, color: "#166534" }}>
              {shipping === 0 ? "Free" : `PKR ${shipping.toLocaleString()}`}
            </Typography>
          </Box>
        ) : (
          <Typography sx={{ fontWeight: 600 }}>
            {shipping === 0 ? "Free" : `PKR ${shipping.toLocaleString()}`}
          </Typography>
        )}
      </Box>
      {!isPromo && showDiscount && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "right",
            color: "#166534",
            fontWeight: 600,
            mt: 0.25,
          }}
        >
          PKR {discount.toLocaleString()} delivery discount applied from PKR{" "}
          {displayRawFee.toLocaleString()}
        </Typography>
      )}
    </Box>
  );
}
