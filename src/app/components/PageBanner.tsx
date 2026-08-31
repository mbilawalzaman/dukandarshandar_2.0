"use client";

import { Box, Typography } from "@mui/material";
import { BRAND } from "@/lib/constants";

export default function PageBanner({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box
      sx={{
        height: { xs: 160, md: 220 },
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#e8ecef",
        color: BRAND.muted,
        textAlign: "center",
        px: 2,
      }}
    >
      <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: 1, fontSize: { xs: "2rem", md: "3rem" } }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body1" sx={{ mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
