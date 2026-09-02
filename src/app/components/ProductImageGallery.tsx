"use client";

import React, { useState } from "react";
import { Box, IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { BRAND } from "@/lib/constants";

type ProductImageGalleryProps = {
  images: string[];
  alt: string;
  fallback?: string;
};

export default function ProductImageGallery({
  images,
  alt,
  fallback = "/images/logo.jpg",
}: ProductImageGalleryProps) {
  const galleryImages = images.length > 0 ? images : [fallback];
  const [activeIndex, setActiveIndex] = useState(0);
  const [thumbStart, setThumbStart] = useState(0);

  const visibleThumbs = 5;
  const maxThumbStart = Math.max(0, galleryImages.length - visibleThumbs);

  const selectImage = (index: number) => {
    setActiveIndex(index);
    if (index < thumbStart) setThumbStart(index);
    else if (index >= thumbStart + visibleThumbs) setThumbStart(index - visibleThumbs + 1);
  };

  const scrollThumbs = (direction: -1 | 1) => {
    setThumbStart((prev) => Math.min(maxThumbStart, Math.max(0, prev + direction)));
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          width: "100%",
          aspectRatio: "1 / 1",
          maxHeight: 480,
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          backgroundColor: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          component="img"
          src={galleryImages[activeIndex]}
          alt={alt}
          sx={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </Box>

      {galleryImages.length > 1 && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
          <IconButton
            size="small"
            onClick={() => scrollThumbs(-1)}
            disabled={thumbStart === 0}
            sx={{ border: "1px solid #e2e8f0", borderRadius: 1 }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>

          <Box sx={{ display: "flex", gap: 1, flex: 1, overflow: "hidden" }}>
            {galleryImages.slice(thumbStart, thumbStart + visibleThumbs).map((src, offset) => {
              const index = thumbStart + offset;
              const selected = index === activeIndex;
              return (
                <Box
                  key={`${src}-${index}`}
                  onClick={() => selectImage(index)}
                  sx={{
                    flex: "0 0 calc(20% - 8px)",
                    minWidth: 56,
                    aspectRatio: "1 / 1",
                    borderRadius: 1,
                    overflow: "hidden",
                    border: selected ? `2px solid ${BRAND.gold}` : "1px solid #e2e8f0",
                    cursor: "pointer",
                    opacity: selected ? 1 : 0.85,
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <Box
                    component="img"
                    src={src}
                    alt={`${alt} thumbnail ${index + 1}`}
                    sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </Box>
              );
            })}
          </Box>

          <IconButton
            size="small"
            onClick={() => scrollThumbs(1)}
            disabled={thumbStart >= maxThumbStart}
            sx={{ border: "1px solid #e2e8f0", borderRadius: 1 }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}
