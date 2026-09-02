"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import PeopleIcon from "@mui/icons-material/People";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import ChatIcon from "@mui/icons-material/Chat";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AutoAwesomeMosaicIcon from "@mui/icons-material/AutoAwesomeMosaic";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";

const drawerWidth = 240;

interface AdminSidebarProps {
  open: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems = [
  { label: "Dashboard", path: "/admin", icon: <DashboardIcon /> },
  { label: "Products", path: "/admin/products", icon: <ShoppingBagIcon /> },
  { label: "Manage Pages", path: "/admin/pages", icon: <AutoAwesomeMosaicIcon /> },
  { label: "Users", path: "/admin/users", icon: <PeopleIcon /> },
  { label: "Orders", path: "/admin/orders", icon: <ShoppingCartIcon /> },
  { label: "Messages", path: "/admin/messages", icon: <ChatIcon /> },
  { label: "Notifications", path: "/admin/notifications", icon: <NotificationsIcon /> },
  { label: "Support", path: "/admin/support", icon: <SupportAgentIcon /> },
];

export default function AdminSidebar({
  open,
  onToggle,
  mobileOpen = false,
  onMobileClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const drawerContent = (isMobileView: boolean) => (
    <>
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: !isMobileView && !open ? "center" : "space-between",
          px: [1.5],
        }}
      >
        {(isMobileView || open) && (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.5, color: "#38bdf8" }}>
              Admin Portal
            </Typography>
          </Box>
        )}
        {isMobileView ? (
          <IconButton onClick={onMobileClose} sx={{ color: "#94a3b8" }}>
            <CloseIcon />
          </IconButton>
        ) : (
          <IconButton onClick={onToggle} sx={{ color: "#94a3b8" }}>
            {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        )}
      </Toolbar>
      <Divider sx={{ borderColor: "#334155" }} />
      <List sx={{ mt: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ display: "block" }}>
              <ListItemButton
                component={Link}
                href={item.path}
                onClick={isMobileView && onMobileClose ? onMobileClose : undefined}
                sx={{
                  minHeight: 48,
                  justifyContent: !isMobileView && !open ? "center" : "initial",
                  px: 2.5,
                  backgroundColor: isActive ? "rgba(56, 189, 248, 0.15)" : "transparent",
                  borderLeft: isActive ? "4px solid #38bdf8" : "4px solid transparent",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: !isMobileView && !open ? "auto" : 2,
                    justifyContent: "center",
                    color: isActive ? "#38bdf8" : "#94a3b8",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{
                    opacity: !isMobileView && !open ? 0 : 1,
                    color: isActive ? "#38bdf8" : "#e2e8f0",
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#1e293b",
            color: "#f8fafc",
            borderRight: "1px solid #334155",
          },
        }}
      >
        {drawerContent(true)}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: "none", md: "block" },
        width: open ? drawerWidth : 64,
        flexShrink: 0,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        "& .MuiDrawer-paper": {
          width: open ? drawerWidth : 64,
          transition: "width 0.2s ease-in-out",
          overflowX: "hidden",
          backgroundColor: "#1e293b",
          color: "#f8fafc",
          borderRight: "1px solid #334155",
        },
      }}
    >
      {drawerContent(false)}
    </Drawer>
  );
}
