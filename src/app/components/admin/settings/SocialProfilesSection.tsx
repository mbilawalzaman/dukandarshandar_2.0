"use client";

import React from "react";
import { Box, Grid, Paper, TextField, Typography } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import YouTubeIcon from "@mui/icons-material/YouTube";

interface SocialProfilesSectionProps {
  socialLinks: {
    instagram: string;
    facebook: string;
    youtube: string;
  };
  onSocialChange: (platform: "instagram" | "facebook" | "youtube", value: string) => void;
}

export default function SocialProfilesSection({
  socialLinks,
  onSocialChange,
}: SocialProfilesSectionProps) {
  return (
    <Paper sx={{ p: 3.5, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <ShareIcon sx={{ color: "#e1306c" }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Social Profiles
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            size="small"
            label="Instagram URL"
            placeholder="https://instagram.com/yourhandle"
            value={socialLinks.instagram}
            onChange={(e) => onSocialChange("instagram", e.target.value)}
            InputProps={{
              startAdornment: <InstagramIcon sx={{ color: "#E4405F", mr: 1, fontSize: 20 }} />,
            }}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            size="small"
            label="Facebook URL"
            placeholder="https://facebook.com/yourpage"
            value={socialLinks.facebook}
            onChange={(e) => onSocialChange("facebook", e.target.value)}
            InputProps={{
              startAdornment: <FacebookIcon sx={{ color: "#1877F2", mr: 1, fontSize: 20 }} />,
            }}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            size="small"
            label="YouTube URL"
            placeholder="https://youtube.com/@yourchannel"
            value={socialLinks.youtube}
            onChange={(e) => onSocialChange("youtube", e.target.value)}
            InputProps={{
              startAdornment: <YouTubeIcon sx={{ color: "#FF0000", mr: 1, fontSize: 20 }} />,
            }}
          />
        </Grid>
      </Grid>
    </Paper>
  );
}
