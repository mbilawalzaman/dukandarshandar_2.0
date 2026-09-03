"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import type { MediaAsset } from "@/lib/pageSettings";
import BannerMediaRenderer from "./ui/BannerMediaRenderer";

export interface PageBannerProps {
  title: string;
  subtitle?: string;
  bgImage?: string;
  bgMedia?: MediaAsset;
}

export default function PageBanner({ title, subtitle, bgImage, bgMedia }: PageBannerProps) {
  const mediaToRender: MediaAsset | null =
    bgMedia?.url
      ? bgMedia
      : bgImage
        ? {
            type:
              bgImage.toLowerCase().includes("/video/upload/") || /\.(mp4|webm|mov)(\?|$)/i.test(bgImage)
                ? "video"
                : "image",
            url: bgImage,
          }
        : null;

  const isVideo = mediaToRender?.type === "video";
  const isPlainImage = mediaToRender?.type === "image" && Boolean(mediaToRender.url);

  return (
    <Box
      sx={{
        height: { xs: 170, md: 240 },
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: mediaToRender?.url ? "transparent" : "#1e293b",
        backgroundImage:
          isPlainImage
            ? `linear-gradient(rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.6)), url(${mediaToRender.url})`
            : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "#ffffff",
        textAlign: "center",
        px: 2,
        overflow: "hidden",
      }}
    >
      {isVideo && mediaToRender && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 0,
          }}
        >
          <BannerMediaRenderer media={mediaToRender} style={{ width: "100%", height: "100%" }} />
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(15, 23, 42, 0.5)",
            }}
          />
        </Box>
      )}

      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            letterSpacing: 1,
            fontSize: { xs: "2rem", md: "2.8rem" },
            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
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
              color: "rgba(255, 255, 255, 0.9)",
              textShadow: "0 1px 6px rgba(0,0,0,0.5)",
              fontSize: { xs: "0.95rem", md: "1.05rem" },
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
