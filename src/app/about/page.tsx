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
import type { PageSettings, AboutHighlightItem } from "@/lib/pageSettings";
import { DEFAULT_PAGE_SETTINGS } from "@/lib/pageSettings";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";

const ICON_MAP: Record<string, React.ReactNode> = {
  time: <AccessTimeIcon />,
  craft: <ColorLensIcon />,
  shipping: <LocalShippingIcon />,
  security: <SecurityIcon />,
};

export default function AboutPage() {
  const [index, setIndex] = useState(0);
  const [settings, setSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
  const { settings: deliverySettings } = useDeliverySettings();
  const storeName = deliverySettings.shopName || "";

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

  const rawHighlights = settings.about.highlights || [];
  const highlights = rawHighlights
    .filter((item) => (item.title || "").trim() || (item.text || "").trim())
    .map((item: AboutHighlightItem) => {
      const displayTitle = (item.title || "").replace(/\{storeName\}/g, storeName || "Our Store");
      const displayText = (item.text || "").replace(/\{storeName\}/g, storeName || "our store");
      return {
        ...item,
        icon: ICON_MAP[item.icon] || ICON_MAP.time,
        title: displayTitle,
        text: displayText,
      };
    });

  const story = settings.about.story || {
    title: "",
    text: "",
    image: "",
    buttonText: "View products",
    buttonLink: "/shop",
  };

  const storyTitle = (story.title || "").replace(/\{storeName\}/g, storeName || "Our Store");
  const storyText = (story.text || "").replace(/\{storeName\}/g, storeName || "our store");

  const quotes = (settings.about.quotes || []).filter((q) => q.trim()).map((q) =>
    q.replace(/\{storeName\}/g, storeName || "our store")
  );

  return (
    <Box>
      <PageBanner
        title={settings.about.bannerTitle || "ABOUT US"}
        subtitle={settings.about.bannerSubtitle}
        bgImage={settings.about.bannerImage}
        bgMedia={settings.about.bannerMedia}
      />

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {highlights.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 6 }}>
            {highlights.map((item, idx) => (
              <Grid item xs={12} sm={6} md={3} key={item.id || idx}>
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
        )}

        {(storyTitle || storyText || story.image) && (
          <Grid container spacing={6} alignItems="center" sx={{ mb: 8 }}>
            {story.image ? (
              <Grid item xs={12} md={6}>
                <Box
                  component="img"
                  src={story.image}
                  alt={`About ${storeName}`}
                  sx={{ width: "100%", borderRadius: 4, maxHeight: 420, objectFit: "cover" }}
                />
              </Grid>
            ) : null}
            <Grid item xs={12} md={story.image ? 6 : 12}>
              {storyTitle && (
                <Typography variant="h4" sx={{ mb: 2 }}>
                  {storyTitle}
                </Typography>
              )}
              {storyText && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
                  {storyText}
                </Typography>
              )}
              {story.buttonText && (
                <Button component={Link} href={story.buttonLink || "/shop"} variant="contained">
                  {story.buttonText}
                </Button>
              )}
            </Grid>
          </Grid>
        )}

        {quotes.length > 0 && (
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
            <IconButton onClick={() => setIndex((i) => (i === 0 ? quotes.length - 1 : i - 1))} aria-label="Previous">
              <ArrowBackIosNewIcon />
            </IconButton>
            <Typography variant="body1" sx={{ textAlign: "center", flexGrow: 1, lineHeight: 1.8 }}>
              {quotes[index % quotes.length]}
            </Typography>
            <IconButton onClick={() => setIndex((i) => (i === quotes.length - 1 ? 0 : i + 1))} aria-label="Next">
              <ArrowForwardIosIcon />
            </IconButton>
          </Box>
        )}
      </Container>
    </Box>
  );
}
