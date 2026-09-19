"use client";

import React from "react";
import { Box, Chip, Grid, Paper, Typography } from "@mui/material";
import PaletteIcon from "@mui/icons-material/Palette";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { ThemeKey } from "@/lib/themePresets";
import { THEME_KEYS, THEME_PRESETS, getThemePresetName } from "@/lib/themePresets";
import { useSafeStoreSettings } from "@/app/providers/StoreSettingsProvider";

interface ThemeSelectorSectionProps {
  selectedThemeKey: ThemeKey;
  previewThemeKey: ThemeKey | null;
  onSelectTheme: (key: ThemeKey) => void;
  onClearPreview: () => void;
}

export default function ThemeSelectorSection({
  selectedThemeKey,
  previewThemeKey,
  onSelectTheme,
  onClearPreview,
}: ThemeSelectorSectionProps) {
  const { settings } = useSafeStoreSettings();
  const shopName = settings.shopName;

  return (
    <Paper sx={{ p: 3.5, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <PaletteIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Theme & Appearance Design
          </Typography>
        </Box>
        {previewThemeKey && (
          <Chip
            label={`Previewing ${getThemePresetName(previewThemeKey, shopName)}`}
            color="warning"
            size="small"
            onDelete={onClearPreview}
          />
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Click any marketplace theme preset below to live-preview on your screen. Click <strong>Save settings</strong> to apply it store-wide for all visitors.
      </Typography>

      <Grid container spacing={2}>
        {THEME_KEYS.map((key) => {
          const preset = THEME_PRESETS[key];
          const displayName = getThemePresetName(key, shopName);
          const isSelected = selectedThemeKey === key;
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={key}>
              <Paper
                onClick={() => onSelectTheme(key)}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  cursor: "pointer",
                  border: isSelected ? "2px solid" : "1px solid #e2e8f0",
                  borderColor: isSelected ? preset.palette.primary.main : "#e2e8f0",
                  backgroundColor: isSelected ? `${preset.palette.primary.main}08` : "#ffffff",
                  transition: "all 0.2s ease",
                  position: "relative",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                  },
                }}
                elevation={isSelected ? 2 : 0}
              >
                {isSelected && (
                  <CheckCircleIcon
                    sx={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      color: preset.palette.primary.main,
                      fontSize: 22,
                    }}
                  />
                )}
                <Chip
                  label={preset.badgeTag}
                  size="small"
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    mb: 1.5,
                    backgroundColor: `${preset.palette.primary.main}22`,
                    color: preset.palette.primary.dark,
                  }}
                />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, pr: 3 }}>
                  {displayName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem", mb: 2, height: 38, overflow: "hidden" }}>
                  {preset.subtitle}
                </Typography>

                {/* Color Swatch Dots */}
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: preset.palette.primary.main,
                      border: "1px solid rgba(0,0,0,0.1)",
                    }}
                    title="Primary Color"
                  />
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: preset.palette.secondary.main,
                      border: "1px solid rgba(0,0,0,0.1)",
                    }}
                    title="Secondary Color"
                  />
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: preset.palette.marketplace.accentRed,
                      border: "1px solid rgba(0,0,0,0.1)",
                    }}
                    title="Accent Red"
                  />
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: preset.palette.marketplace.accentGreen,
                      border: "1px solid rgba(0,0,0,0.1)",
                    }}
                    title="Accent Green"
                  />
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
}
