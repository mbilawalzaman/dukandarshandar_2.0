"use client";

import React from "react";
import { Container, Grid, Card, CardContent, Typography, Box, Avatar } from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import SecurityIcon from "@mui/icons-material/Security";

const features = [
  {
    icon: <VerifiedIcon fontSize="large" />,
    color: "#3b82f6",
    title: "Welcome to Dukandar Shandar",
    desc1: "Explore a world of creativity and inspiration at our stationary and craft ecommerce shop.",
    desc2: "Whether you're a seasoned crafter or just starting, we have everything you need for your next project.",
  },
  {
    icon: <ColorLensIcon fontSize="large" />,
    color: "#8b5cf6",
    title: "Quality Craft Supplies",
    desc1: "Discover premium craft supplies that elevate your projects. From high-quality paper to unique embellishments.",
    desc2: "Explore our collection and let your imagination run wild.",
  },
  {
    icon: <LocalShippingIcon fontSize="large" />,
    color: "#f59e0b",
    title: "Express Your Style",
    desc1: "At Dukandar Shandar, we celebrate individuality. Find products that match your unique style and express your creativity.",
    desc2: "Personalize your space with our carefully curated selection of stationery and craft items.",
  },
  {
    icon: <SecurityIcon fontSize="large" />,
    color: "#10b981",
    title: "Shop with Confidence",
    desc1: "Enjoy a seamless shopping experience with Dukandar Shandar. Our commitment to customer satisfaction ensures that you can shop with confidence.",
    desc2: "Discover the joy of creating and shopping for quality products.",
  },
];

export default function HeroSection() {
  return (
    <Box sx={{ py: 6, backgroundColor: "#f8fafc" }}>
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          {features.map((feature, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Card
                sx={{
                  height: "100%",
                  borderRadius: 4,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: "left" }}>
                  <Avatar
                    sx={{
                      backgroundColor: `${feature.color}15`,
                      color: feature.color,
                      width: 56,
                      height: 56,
                      mb: 2,
                    }}
                  >
                    {feature.icon}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a", mb: 1, fontSize: "1.1rem" }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.5 }}>
                    {feature.desc1}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    {feature.desc2}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
