"use client";

import Link from "next/link";
import React from "react";
import Slider from "react-slick";
import { Box } from "@mui/material";
import type { BannerItem, HomeBannerMode } from "@/lib/pageSettings";
import BannerMediaRenderer from "./ui/BannerMediaRenderer";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import { useDeliverySettings } from "@/hooks/useDeliverySettings";
import { safeNavigationHref } from "@/lib/safeNavigation";

interface BannerProps {
  banners?: BannerItem[];
  singleBanner?: BannerItem;
  bannerMode?: HomeBannerMode | "single_lottie";
  images?: string[];
}

const Banner = ({ banners, singleBanner, bannerMode = "image_slider", images }: BannerProps) => {
  const { settings: storeDeliverySettings } = useDeliverySettings();
  const storeName = storeDeliverySettings.shopName || "";
  const mode: HomeBannerMode =
    bannerMode === "single_video" || bannerMode === "single_lottie" ? "single_video" : "image_slider";

  if (mode === "single_video") {
    const mediaToRender =
      singleBanner?.activeMedia?.url
        ? singleBanner.activeMedia
        : banners?.[0]?.activeMedia?.url
          ? banners[0].activeMedia
          : null;

    if (!mediaToRender?.url) {
      return null;
    }

    const goToLink = safeNavigationHref(singleBanner?.goToLink || banners?.[0]?.goToLink);
    const isExternal = Boolean(goToLink && (goToLink.startsWith("http://") || goToLink.startsWith("https://")));

    const singleContent = (
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: { xs: 240, sm: 380, md: 480 },
          cursor: goToLink ? "pointer" : "default",
        }}
      >
        <BannerMediaRenderer
          media={mediaToRender}
          alt={singleBanner?.title || storeName}
          priority={true}
          style={{ width: "100%", height: "100%" }}
        />
      </Box>
    );

    return (
      <Box
        sx={{
          width: "100%",
          overflow: "hidden",
          position: "relative",
          minHeight: { xs: 240, sm: 380, md: 480 },
          backgroundColor: "#0f172a",
        }}
      >
        {goToLink ? (
          <Box
            component={Link}
            href={goToLink}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            sx={{ display: "block", textDecoration: "none" }}
          >
            {singleContent}
          </Box>
        ) : (
          singleContent
        )}
      </Box>
    );
  }

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
        activeMedia: { type: "image" as const, url: img },
        processingStatus: "idle" as const,
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
        backgroundColor: "var(--theme-bg-default, #f8fafc)",
      }}
    >
      <Slider {...settings}>
        {activeBanners.map((banner, index) => {
          const goToLink = safeNavigationHref(banner.goToLink);
          const isExternal = Boolean(goToLink && (goToLink.startsWith("http://") || goToLink.startsWith("https://")));

          const slideContent = (
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: { xs: 240, sm: 380, md: 480 },
                cursor: goToLink ? "pointer" : "default",
              }}
            >
              <BannerMediaRenderer
                media={banner.activeMedia}
                alt={banner.title || `Banner ${index + 1}`}
                priority={index === 0}
                style={{ width: "100%", height: "100%" }}
              />
            </Box>
          );

          return (
            <Box key={banner.id || index}>
              {goToLink ? (
                <Box
                  component={Link}
                  href={goToLink}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  sx={{ display: "block", textDecoration: "none" }}
                >
                  {slideContent}
                </Box>
              ) : (
                slideContent
              )}
            </Box>
          );
        })}
      </Slider>
    </Box>
  );
};

export default Banner;
