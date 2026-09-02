"use client";

import { Box, Typography } from "@mui/material";
import { BRAND } from "@/lib/constants";

type DeliveryShippingLineProps = {
  shipping: number;
  isPromo: boolean;
  standardFee?: number;
  label?: string;
};

export default function DeliveryShippingLine({
  shipping,
  isPromo,
  standardFee = 0,
  label = "Shipping Fee",
}: DeliveryShippingLineProps) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
      <Typography color="text.secondary">{label}</Typography>
      {isPromo ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {standardFee > 0 && (
            <Typography
              variant="body2"
              sx={{ color: "text.disabled", textDecoration: "line-through", fontWeight: 500 }}
            >
              PKR {standardFee.toLocaleString()}
            </Typography>
          )}
          <Typography sx={{ fontWeight: 800, color: BRAND.goldDark }}>FREE</Typography>
        </Box>
      ) : (
        <Typography sx={{ fontWeight: 600 }}>
          {shipping === 0 ? "Free" : `PKR ${shipping.toLocaleString()}`}
        </Typography>
      )}
    </Box>
  );
}
