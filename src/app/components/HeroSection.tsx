"use client";

import React, { useEffect, useState } from "react";
import { Container, Grid, Card, CardContent, Typography, Box, Avatar } from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import SecurityIcon from "@mui/icons-material/Security";

import { useDeliverySettings } from "@/hooks/useDeliverySettings";
import type { HeroSectionConfig, HeroFeatureItem } from "@/lib/pageSettings";
import { DEFAULT_PAGE_SETTINGS } from "@/lib/pageSettings";

const ICON_MAP: Record<string, { icon: React.ReactNode; color: string }> = {
  verified: { icon: <VerifiedIcon fontSize="large" />, color: "#3b82f6" },
  craft: { icon: <ColorLensIcon fontSize="large" />, color: "#8b5cf6" },
  shipping: { icon: <LocalShippingIcon fontSize="large" />, color: "#f59e0b" },
  security: { icon: <SecurityIcon fontSize="large" />, color: "#10b981" },
};

interface HeroSectionProps {
  config?: HeroSectionConfig;
}

export default function HeroSection({ config: propConfig }: HeroSectionProps) {
  const { settings: deliverySettings } = useDeliverySettings();
  const storeName = deliverySettings.shopName || "";

  const [heroConfig, setHeroConfig] = useState<HeroSectionConfig | null>(
    propConfig !== undefined ? propConfig : null
  );

  useEffect(() => {
    if (propConfig !== undefined) {
      setHeroConfig(propConfig);
      return;
    }

    const loadSettings = async () => {
      try {
        const res = await fetch("/api/page-settings");
        const data = await res.json();
        if (data.success && data.settings?.home?.heroSection) {
          setHeroConfig(data.settings.home.heroSection);
        } else {
          setHeroConfig(DEFAULT_PAGE_SETTINGS.home.heroSection!);
        }
      } catch (err) {
        console.error("Error loading hero section settings:", err);
      }
    };
    loadSettings();
  }, [propConfig]);

  if (!heroConfig || heroConfig.enabled === false) {
    return null;
  }

  const features = (heroConfig.features || DEFAULT_PAGE_SETTINGS.home.heroSection!.features).map(
    (feat: HeroFeatureItem, idx: number) => {
      const iconKey = feat.icon || (idx === 0 ? "verified" : idx === 1 ? "craft" : idx === 2 ? "shipping" : "security");
      const iconInfo = ICON_MAP[iconKey] || ICON_MAP.verified!;
      const displayTitle = (feat.title || "").replace(/\{storeName\}/g, storeName || "Our Store");
      const displayDesc1 = (feat.desc1 || "").replace(/\{storeName\}/g, storeName || "our store");
      const displayDesc2 = (feat.desc2 || "").replace(/\{storeName\}/g, storeName || "our store");

      return {
        ...feat,
        icon: iconInfo.icon,
        color: iconInfo.color,
        title: displayTitle,
        desc1: displayDesc1,
        desc2: displayDesc2,
      };
    }
  );

  return (
    <Box sx={{ py: 6, backgroundColor: "#f8fafc" }}>
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          {features.map((feature, idx) => (
            <Grid item xs={12} sm={6} md={3} key={feature.id || idx}>
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
