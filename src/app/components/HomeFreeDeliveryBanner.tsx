"use client";

import { Box } from "@mui/material";
import FreeDeliveryPromoBanner from "@/app/components/FreeDeliveryPromoBanner";

type HomeFreeDeliveryBannerProps = {
  savedAmount: number;
};

export default function HomeFreeDeliveryBanner({ savedAmount }: HomeFreeDeliveryBannerProps) {
  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        px: { xs: 2, sm: 3 },
        pt: { xs: 2, md: 3 },
      }}
    >
      <FreeDeliveryPromoBanner savedAmount={savedAmount} />
    </Box>
  );
}
