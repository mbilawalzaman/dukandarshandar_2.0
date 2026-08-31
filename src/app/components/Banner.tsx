"use client";

import React from "react";
import Image from "next/image";
import Slider from "react-slick";
import { Box } from "@mui/material";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const defaultImages = [
  "/images/banner1.jpg",
  "/images/banner2.jpg",
  "/images/banner3.jpg",
];

interface BannerProps {
  images?: string[];
}

const Banner = ({ images = defaultImages }: BannerProps) => {
  const slideImages = Array.isArray(images) && images.length > 0 ? images : defaultImages;

  const settings = {
    dots: true,
    infinite: slideImages.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: slideImages.length > 1,
    autoplaySpeed: 3500,
    appendDots: (dots: React.ReactNode) => (
      <Box
        sx={{
          position: "absolute",
          bottom: "12px",
          width: "100%",
          display: "flex",
          justifyContent: "center",
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
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          transition: "background-color 0.3s ease",
        }}
      />
    ),
  };

  return (
    <Box sx={{ width: "100%", overflow: "hidden", position: "relative" }}>
      <Slider {...settings}>
        {slideImages.map((src, index) => (
          <Box key={index} sx={{ position: "relative", width: "100%", height: { xs: 220, md: 460 } }}>
            <Image
              src={src}
              alt={`Banner ${index + 1}`}
              fill
              priority={index === 0}
              unoptimized
              style={{ objectFit: "cover" }}
            />
          </Box>
        ))}
      </Slider>
    </Box>
  );
};

export default Banner;
