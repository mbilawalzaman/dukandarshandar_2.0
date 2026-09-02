"use client";

import { Alert, Box, Typography } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { BRAND } from "@/lib/constants";

type FreeDeliveryPromoBannerProps = {
  savedAmount?: number;
  compact?: boolean;
};

export default function FreeDeliveryPromoBanner({ savedAmount, compact = false }: FreeDeliveryPromoBannerProps) {
  return (
    <Alert
      icon={<LocalShippingIcon fontSize="inherit" />}
      severity="success"
      sx={{
        mb: compact ? 1.5 : 2,
        borderRadius: 2.5,
        alignItems: "flex-start",
        backgroundColor: "rgba(254, 190, 76, 0.14)",
        color: BRAND.navy,
        border: `1px solid ${BRAND.gold}`,
        "& .MuiAlert-icon": { color: BRAND.goldDark, mt: 0.25 },
      }}
    >
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: BRAND.navy }}>
          Free delivery on us
        </Typography>
        <Typography variant="body2" sx={{ color: BRAND.muted, mt: 0.25 }}>
          {savedAmount && savedAmount > 0
            ? `We've waived the delivery fee on your order save PKR ${savedAmount.toLocaleString()} today.`
            : "We've waived the delivery fee on your order a little thank you from Dukandar Shandar."}
        </Typography>
      </Box>
    </Alert>
  );
}
