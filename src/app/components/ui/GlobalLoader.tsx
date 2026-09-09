"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import Image from "next/image";
import { BRAND } from "@/lib/constants";

interface GlobalLoaderProps {
  fullScreen?: boolean;
  message?: string;
  size?: number;
}

export default function GlobalLoader({
  fullScreen = true,
  message,
  size = 120,
}: GlobalLoaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: fullScreen ? "70vh" : "250px",
        width: "100%",
        py: 4,
        position: "relative",
      }}
    >
      {/* Outer Gooey / Pulsing Circles Container */}
      <Box
        sx={{
          position: "relative",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Animated Gooey Rings */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `3px solid transparent`,
            borderTopColor: BRAND.gold,
            borderRightColor: "#042549",
            animation: "spinSlow 1.4s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite",
            "@keyframes spinSlow": {
              "0%": { transform: "rotate(0deg)" },
              "100%": { transform: "rotate(360deg)" },
            },
          }}
        />

        <Box
          sx={{
            position: "absolute",
            inset: 12,
            borderRadius: "50%",
            border: `3px solid transparent`,
            borderBottomColor: BRAND.gold,
            borderLeftColor: "#e8ecef",
            animation: "spinReverse 1s linear infinite",
            "@keyframes spinReverse": {
              "0%": { transform: "rotate(360deg)" },
              "100%": { transform: "rotate(0deg)" },
            },
          }}
        />

        {/* Pulsing Center Brand Icon / Dot */}
        <Box
          sx={{
            width: size * 0.45,
            height: size * 0.45,
            borderRadius: "50%",
            backgroundColor: "#042549",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 20px ${BRAND.gold}66`,
            animation: "pulseGlow 1.8s ease-in-out infinite alternate",
            "@keyframes pulseGlow": {
              "0%": { transform: "scale(0.88)", boxShadow: `0 0 10px ${BRAND.gold}33` },
              "100%": { transform: "scale(1.08)", boxShadow: `0 0 25px ${BRAND.gold}aa` },
            },
          }}
        >
          <Image
            src="/images/ds-icon.png"
            alt="Dukandar Shandar"
            width={32}
            height={32}
            style={{ objectFit: "contain" }}
          />
        </Box>
      </Box>

      {/* Optional Loading Message */}
      {message && (
        <Typography
          variant="body2"
          sx={{
            mt: 2.5,
            fontWeight: 600,
            color: "#042549",
            letterSpacing: 0.5,
            animation: "fadeInOut 1.5s ease-in-out infinite alternate",
            "@keyframes fadeInOut": {
              "0%": { opacity: 0.6 },
              "100%": { opacity: 1 },
            },
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
}
