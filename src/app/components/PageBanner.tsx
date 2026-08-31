"use client";

import { Box, Typography } from "@mui/material";
import { BRAND } from "@/lib/constants";

export interface PageBannerProps {
  title: string;
  subtitle?: string;
  bgImage?: string;
}

export default function PageBanner({ title, subtitle, bgImage }: PageBannerProps) {
  return (
    <Box
      sx={{
        height: { xs: 170, md: 230 },
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: bgImage ? "transparent" : "#e8ecef",
        backgroundImage: bgImage ? `linear-gradient(rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.55)), url(${bgImage})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: bgImage ? "#ffffff" : BRAND.muted,
        textAlign: "center",
        px: 2,
        overflow: "hidden",
      }}
    >
      <Typography
        variant="h3"
        sx={{
          fontWeight: 800,
          letterSpacing: 1,
          fontSize: { xs: "2rem", md: "2.8rem" },
          textShadow: bgImage ? "0 2px 10px rgba(0,0,0,0.4)" : "none",
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          variant="body1"
          sx={{
            mt: 1,
            maxWidth: 680,
            color: bgImage ? "rgba(255, 255, 255, 0.9)" : "inherit",
            textShadow: bgImage ? "0 1px 6px rgba(0,0,0,0.4)" : "none",
            fontSize: { xs: "0.95rem", md: "1.05rem" },
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
