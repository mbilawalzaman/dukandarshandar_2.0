"use client";

import React from "react";
import Slider from "react-slick";
import { Box } from "@mui/material";
import { BannerItem } from "@/lib/pageSettings";
import BannerMediaRenderer from "./ui/BannerMediaRenderer";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

interface BannerProps {
  banners?: BannerItem[];
  singleBanner?: BannerItem;
  bannerMode?: "image_slider" | "single_lottie";
  images?: string[]; // Legacy fallback prop
}

const Banner = ({ banners, singleBanner, bannerMode = "image_slider", images }: BannerProps) => {
  // 1. Single Lottie / Video Banner Mode
  if (bannerMode === "single_lottie") {
    // If single banner has media URL, render it
    // If not (e.g. video is currently in conversion queue), render the user's previous live image banner
    const mediaToRender =
      singleBanner?.activeMedia?.url
        ? singleBanner.activeMedia
        : banners?.[0]?.activeMedia?.url
        ? banners[0].activeMedia
        : null;

    if (!mediaToRender?.url) {
      return null;
    }

    return (
      <Box
        sx={{
          width: "100%",
          overflow: "hidden",
          position: "relative",
          minHeight: { xs: 240, sm: 380, md: 480 },
          backgroundColor: "#f8fafc",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: { xs: 240, sm: 380, md: 480 },
          }}
        >
          <BannerMediaRenderer
            media={mediaToRender}
            alt={singleBanner?.title || "Dukandar Shandar"}
            priority={true}
            style={{ width: "100%", height: "100%" }}
          />
        </Box>
      </Box>
    );
  }

  // 2. Multi-Image Slideshow Carousel Mode
  let activeBanners: BannerItem[] = [];

  if (Array.isArray(banners) && banners.length > 0) {
    activeBanners = banners.filter((b) => b.isActive !== false && b.activeMedia?.url);
  } else if (Array.isArray(images) && images.length > 0) {
    activeBanners = images
      .filter(Boolean)
      .map((img, idx) => ({
        id: `banner-${idx + 1}`,
        title: `Banner ${idx + 1}`,
        order: idx + 1,
        isActive: true,
        activeMedia: { type: "image", url: img },
        processingStatus: "idle",
      }));
  }

  if (activeBanners.length === 0) {
    return null;
  }

  const settings = {
    dots: true,
    infinite: activeBanners.length > 1,
    speed: 600,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: activeBanners.length > 1,
    autoplaySpeed: 4500,
    pauseOnHover: true,
    appendDots: (dots: React.ReactNode) => (
      <Box
        sx={{
          position: "absolute",
          bottom: "16px",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        {dots}
      </Box>
    ),
    customPaging: () => (
      <Box
        sx={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          backgroundColor: "rgba(255, 255, 255, 0.75)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
          transition: "background-color 0.3s ease",
          "&:hover": { backgroundColor: "#ffffff" },
        }}
      />
    ),
  };

  return (
    <Box
      sx={{
        width: "100%",
        overflow: "hidden",
        position: "relative",
        minHeight: { xs: 240, sm: 380, md: 480 },
        backgroundColor: "#f8fafc",
      }}
    >
      <Slider {...settings}>
        {activeBanners.map((banner, index) => (
          <Box key={banner.id || index}>
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: { xs: 240, sm: 380, md: 480 },
              }}
            >
              <BannerMediaRenderer
                media={banner.activeMedia}
                alt={banner.title || `Banner ${index + 1}`}
                priority={index === 0}
                style={{ width: "100%", height: "100%" }}
              />
            </Box>
          </Box>
        ))}
      </Slider>
    </Box>
  );
};

export default Banner;
