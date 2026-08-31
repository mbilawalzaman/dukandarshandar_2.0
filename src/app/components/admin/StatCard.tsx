"use client";

import React from "react";
import { Card, CardContent, Typography, Box, Avatar } from "@mui/material";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

export default function StatCard({ title, value, icon, color = "#3b82f6", subtitle }: StatCardProps) {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", height: "100%" }}>
      <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 3 }}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#0f172a" }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar
          sx={{
            backgroundColor: `${color}15`,
            color: color,
            width: 56,
            height: 56,
            boxShadow: `0 4px 12px ${color}30`,
          }}
        >
          {icon}
        </Avatar>
      </CardContent>
    </Card>
  );
}
