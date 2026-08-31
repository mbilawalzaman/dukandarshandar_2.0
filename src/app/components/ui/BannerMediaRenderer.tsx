"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Box, CircularProgress, Typography } from "@mui/material";
import { Lottie } from "lottie-react";
import { MediaAsset } from "@/lib/pageSettings";

interface BannerMediaRendererProps {
  media?: MediaAsset | null;
  alt?: string;
  priority?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

function isJsonOrLottieUrl(url: string, type?: string): boolean {
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
  const [lottieData, setLottieData] = useState<Record<string, unknown> | null>(null);
  const [lottieLoading, setLottieLoading] = useState(false);
  const [lottieError, setLottieError] = useState(false);

  const mediaType = media?.type || "image";
  const mediaUrl = media?.url || "";
  const isLottie = isJsonOrLottieUrl(mediaUrl, mediaType);

  useEffect(() => {
    if (isLottie && mediaUrl) {
      setLottieLoading(true);
      setLottieError(false);

      // If mediaUrl is already a direct raw JSON string
      if (mediaUrl.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(mediaUrl);
          setLottieData(parsed);
          setLottieLoading(false);
          return;
        } catch {
          setLottieError(true);
          setLottieLoading(false);
          return;
        }
      }

      // Fetch remote Lottie JSON from Cloudinary CDN
      let isMounted = true;
      fetch(mediaUrl)
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          if (!text.trim().startsWith("{")) {
            throw new Error("Invalid Lottie JSON payload");
          }
          return JSON.parse(text);
        })
        .then((data) => {
          if (isMounted) {
            setLottieData(data);
            setLottieLoading(false);
          }
        })
        .catch((err) => {
          console.warn("Lottie fetch failed:", err.message);
          if (isMounted) {
            setLottieError(true);
            setLottieLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isLottie, mediaUrl]);

  if (!mediaUrl) {
    return null;
  }

  // 1. LOTTIE ANIMATION RENDERER
  if (isLottie) {
    if (lottieLoading) {
      return (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8fafc",
            minHeight: { xs: 240, md: 400 },
          }}
        >
          <CircularProgress size={36} sx={{ color: "#f59e0b" }} />
        </Box>
      );
    }

    if (lottieError || !lottieData) {
      return (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0f172a",
            minHeight: { xs: 240, md: 400 },
            ...style,
          }}
        >
          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
            Animation ready
          </Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          overflow: "hidden",
          ...style,
        }}
      >
        <Lottie
          src={lottieData}
          loop={true}
          autoplay={true}
          style={{ width: "100%", height: "100%", maxHeight: "550px", objectFit: "contain" }}
        />
      </Box>
    );
  }

  // 2. REGULAR IMAGE RENDERER (JPG, PNG, WebP, etc.)
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
