"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  IconButton,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SecurityIcon from "@mui/icons-material/Security";
import Link from "next/link";
import PageBanner from "../components/PageBanner";
import { BRAND } from "@/lib/constants";
import { DEFAULT_PAGE_SETTINGS, PageSettings } from "@/lib/pageSettings";

const highlights = [
  {
    icon: <AccessTimeIcon />,
    title: "Welcome to Dukandar Shandar",
    text: "Explore a world of creativity at our stationery and craft shop whether you are a seasoned crafter or just starting out.",
  },
  {
    icon: <ColorLensIcon />,
    title: "Quality Craft Supplies",
    text: "Premium paper, unique embellishments, and supplies that elevate every project.",
  },
  {
    icon: <LocalShippingIcon />,
    title: "Express Your Style",
    text: "Find products that match your unique style and personalize your space with our curated selection.",
  },
  {
    icon: <SecurityIcon />,
    title: "Shop with Confidence",
    text: "A seamless shopping experience with a commitment to customer satisfaction.",
  },
];

const carousel = [
  "Dive into the extraordinary world of Dukandar Shandar, your premier destination for stationery and craft essentials. Unleash your creativity with our handpicked collection.",
  "At Dukandar Shandar, we bring you a seamless shopping experience and an extensive range of supplies. Every purchase is meant to fuel your creative pursuits.",
  "Explore Dukandar Shandar, where stationery and craft unfold in endless possibilities. Our curated selection is a testament to inspiring creativity.",
];

export default function AboutPage() {
  const [index, setIndex] = useState(0);
  const [settings, setSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/page-settings");
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      } catch (err) {
        console.error("Error loading about page settings:", err);
      }
    };
    loadSettings();
  }, []);

  return (
    <Box>
      <PageBanner
        title={settings.about.bannerTitle || "ABOUT US"}
        subtitle={settings.about.bannerSubtitle}
        bgImage={settings.about.bannerImage}
        bgMedia={settings.about.bannerMedia}
      />

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {highlights.map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.title}>
              <Card sx={{ height: "100%", borderRadius: 3, p: 1 }}>
                <CardContent>
                  <Avatar sx={{ bgcolor: `${BRAND.gold}33`, color: BRAND.goldDark, mb: 2 }}>{item.icon}</Avatar>
                  <Typography variant="h6" sx={{ mb: 1, fontSize: "1.05rem" }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.text}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={6} alignItems="center" sx={{ mb: 8 }}>
          <Grid item xs={12} md={6}>
            <Box
              component="img"
              src="https://static-01.daraz.pk/p/c14261730e3d0b1804a834d26de230eb.jpg_750x750.jpg_.webp"
              alt="About Dukandar Shandar"
              sx={{ width: "100%", borderRadius: 4, maxHeight: 420, objectFit: "cover" }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h4" sx={{ mb: 2 }}>
              Our story
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
              Welcome to Dukandar Shandar, your one-stop destination for stationery and craft. We offer a curated
              selection of high-quality supplies that spark creativity and innovation. With a commitment to excellence,
              we bring you products that cater to your artistic needs. Explore our range and elevate your crafting
              experience.
            </Typography>
            <Button component={Link} href="/shop" variant="contained">
              View products
            </Button>
          </Grid>
        </Grid>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            backgroundColor: BRAND.surface,
            borderRadius: 4,
            p: { xs: 3, md: 5 },
          }}
        >
          <IconButton onClick={() => setIndex((i) => (i === 0 ? carousel.length - 1 : i - 1))} aria-label="Previous">
            <ArrowBackIosNewIcon />
          </IconButton>
          <Typography variant="body1" sx={{ textAlign: "center", flexGrow: 1, lineHeight: 1.8 }}>
            {carousel[index]}
          </Typography>
          <IconButton onClick={() => setIndex((i) => (i === carousel.length - 1 ? 0 : i + 1))} aria-label="Next">
            <ArrowForwardIosIcon />
          </IconButton>
        </Box>
      </Container>
    </Box>
  );
}
