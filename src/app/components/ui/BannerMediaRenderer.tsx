"use client";

import React from "react";
import Image from "next/image";
import { Box, Typography } from "@mui/material";
import { MediaAsset } from "@/lib/pageSettings";
import { toPlayableVideoUrl } from "@/lib/cloudinaryUrl";

interface BannerMediaRendererProps {
  media?: MediaAsset | null;
  alt?: string;
  priority?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

function isVideoUrl(url: string, type?: string): boolean {
  if (type === "video") return true;
  if (!url) return false;
  const cleanUrl = url.toLowerCase().split("?")[0];
  return (
    cleanUrl.includes("/video/upload/") ||
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".webm") ||
    cleanUrl.endsWith(".mov")
  );
}

function isLegacyLottieUrl(url: string, type?: string): boolean {
  if (type === "lottie") return true;
  if (!url) return false;
  const cleanUrl = url.toLowerCase().split("?")[0];
  return (
    cleanUrl.endsWith(".json") ||
    cleanUrl.includes("/raw/upload/") ||
    cleanUrl.startsWith("data:application/json")
  );
}

export default function BannerMediaRenderer({
  media,
  alt = "Store Banner",
  priority = false,
  style,
}: BannerMediaRendererProps) {
  const mediaType = media?.type || "image";
  const mediaUrl = media?.url || "";

  if (!mediaUrl) {
    return null;
  }

  if (isLegacyLottieUrl(mediaUrl, mediaType)) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          minHeight: { xs: 180, md: 280 },
          px: 2,
          ...style,
        }}
      >
        <Typography variant="body2" sx={{ color: "#94a3b8", textAlign: "center" }}>
          Legacy Lottie banner removed. Re-upload an MP4 or image in Admin → Manage Pages.
        </Typography>
      </Box>
    );
  }

  if (isVideoUrl(mediaUrl, mediaType)) {
    const playableUrl = toPlayableVideoUrl(mediaUrl);
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          backgroundColor: "#0f172a",
          overflow: "hidden",
          ...style,
        }}
      >
        <Box
          component="video"
          key={playableUrl}
          src={playableUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label={alt}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: { xs: "240px", sm: "380px", md: "500px" },
        ...style,
      }}
    >
      <Image
        src={mediaUrl}
        alt={alt}
        fill
        priority={priority}
        sizes="100vw"
        style={{
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
    </Box>
  );
}
