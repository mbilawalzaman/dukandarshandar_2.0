"use client";

import { useEffect, useState } from "react";
import { Container, Typography, Box, Paper, Divider } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import { BRAND } from "@/lib/constants";
import PageBanner from "../components/PageBanner";
import type { PageSettings } from "@/lib/pageSettings";
import { DEFAULT_PAGE_SETTINGS } from "@/lib/pageSettings";

export default function PrivacyPolicyPage() {
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
        console.error("Error loading privacy policy page settings:", err);
      }
    };
    loadSettings();
  }, []);

  const config = settings.privacy || DEFAULT_PAGE_SETTINGS.privacy;

  return (
    <Box>
      <PageBanner
        title={config.bannerTitle || "PRIVACY POLICY"}
        subtitle={config.bannerSubtitle}
        bgImage={config.bannerImage}
        bgMedia={config.bannerMedia}
      />

      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <SecurityIcon sx={{ fontSize: 36, color: BRAND.navy }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: BRAND.navy }}>
              {config.bannerTitle || "Privacy Policy"}
            </Typography>
          </Box>
          {config.lastUpdated && (
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3 }}>
              Last updated: {config.lastUpdated}
            </Typography>
          )}

          <Divider sx={{ mb: 4 }} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5, color: "#334155", lineHeight: 1.7 }}>
            {(config.sections || []).map((sec, idx) => (
              <Box key={sec.id || idx}>
                {sec.title && (
                  <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND.navy, mb: 1 }}>
                    {idx + 1}. {sec.title}
                  </Typography>
                )}
                {sec.content && (
                  <Typography variant="body1" sx={{ whitespace: "pre-line", color: "#334155" }}>
                    {sec.content}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
