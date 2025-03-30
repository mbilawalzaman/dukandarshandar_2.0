"use client";

import React from "react";
import Image from "next/image";
import Slider from "react-slick";
import { Box } from "@mui/material";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const images = [
    "/images/banner1.jpg",
    "/images/banner2.jpg",
    "/images/banner3.jpg"
];

const Banner = () => {
    const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 3000,
        appendDots: (dots: React.ReactNode) => (
            <Box
                sx={{
                    position: "absolute",
                    bottom: "10px",
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
                    backgroundColor: "gray",
                    transition: "background-color 0.3s ease",
                }}
            />
        )
    };

    return (
        <Box sx={{ width: "100vw", overflow: "hidden", mt: 4, pb: 4, position: "relative" }}>
            <Slider {...settings}>
                {images.map((src, index) => (
                    <Box key={index} sx={{ position: "relative", width: "100vw", height: 500 }}>
                        <Image
                            src={src}
                            alt={`Banner ${index + 1}`}
                            fill
                            priority
                            style={{ objectFit: "cover" }} // Use style instead of objectFit
                        />
                    </Box>
                ))}
            </Slider>
        </Box>
    );
};

export default Banner;
