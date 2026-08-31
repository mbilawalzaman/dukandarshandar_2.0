"use client";

import React from "react";
import { Grid, Typography, Box, Paper, Button } from "@mui/material";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PeopleIcon from "@mui/icons-material/People";
import AutoAwesomeMosaicIcon from "@mui/icons-material/AutoAwesomeMosaic";
import Link from "next/link";

interface QuickActionTileProps {
  title: string;
  desc: string;
  href: string;
  btnText: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

function QuickActionTile({ title, desc, href, btnText, icon, iconBg, iconColor }: QuickActionTileProps) {
  return (
    <Grid item xs={12} sm={6} md={3}>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          transition: "transform 0.2s, box-shadow 0.2s",
          "&:hover": {
            transform: "translateY(-3px)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              backgroundColor: iconBg,
              color: iconColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#0f172a" }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
          {desc}
        </Typography>
        <Button
          component={Link}
          href={href}
          variant="outlined"
          fullWidth
          size="small"
          sx={{ textTransform: "none", fontWeight: 600, mt: "auto" }}
        >
          {btnText}
        </Button>
      </Paper>
    </Grid>
  );
}

export default function DashboardQuickActions() {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a", mb: 2 }}>
        Quick Management
      </Typography>
      <Grid container spacing={3}>
        <QuickActionTile
          title="Manage Products"
          desc="Add, edit, restock items, or upload images with Cloudinary."
          href="/admin/products"
          btnText="Go to Products"
          icon={<ShoppingBagIcon />}
          iconBg="#e0f2fe"
          iconColor="#0284c7"
        />
        <QuickActionTile
          title="Process Orders"
          desc="Review customer orders, update tracking status, or auto-restock."
          href="/admin/orders"
          btnText="Go to Orders"
          icon={<ShoppingCartIcon />}
          iconBg="#fef3c7"
          iconColor="#d97706"
        />
        <QuickActionTile
          title="Manage Pages"
          desc="Update home carousel, storefront banners, and product quotas."
          href="/admin/pages"
          btnText="Manage Pages"
          icon={<AutoAwesomeMosaicIcon />}
          iconBg="#f3e8ff"
          iconColor="#9333ea"
        />
        <QuickActionTile
          title="User Accounts"
          desc="View registered customers, admin privileges, and emails."
          href="/admin/users"
          btnText="View Users"
          icon={<PeopleIcon />}
          iconBg="#ecfdf5"
          iconColor="#059669"
        />
      </Grid>
    </Box>
  );
}
