"use client";

import React, { useState } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import CheckIcon from "@mui/icons-material/Check";

import { formatDateTime } from "@/lib/dateUtils";

export interface UserDetailsData {
  _id: string;
  name: string;
  email: string;
  role?: string;
  phone?: string;
  province?: string;
  city?: string;
  area?: string;
  address?: string;
  image?: string;
  authProvider?: string;
  created_at?: string;
}

export interface UserDetailsModalProps {
  open: boolean;
  onClose: () => void;
  user: UserDetailsData | null;
}

export default function UserDetailsModal({
  open,
  onClose,
  user,
}: UserDetailsModalProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!user) return null;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user._id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const isAdmin = user.role?.toLowerCase() === "admin";

  const addressParts = [
    user.address,
    user.area,
    user.city,
    user.province,
  ].filter(Boolean);

  const fullAddress = addressParts.join(", ");

  const authLabel = user.authProvider
    ? user.authProvider.charAt(0).toUpperCase() + user.authProvider.slice(1)
    : "Email & Password";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            src={user.image}
            alt={user.name}
            sx={{
              width: 44,
              height: 44,
              bgcolor: isAdmin ? "#f59e0b" : "#0284c7",
              fontWeight: 700,
              fontSize: "1.1rem",
            }}
          >
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </Avatar>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}
              >
                {user.name || "Customer Account"}
              </Typography>
              <Chip
                label={isAdmin ? "Administrator" : "Customer"}
                size="small"
                color={isAdmin ? "secondary" : "default"}
                variant={isAdmin ? "filled" : "outlined"}
                sx={{ height: 22, fontSize: "0.75rem", fontWeight: 700 }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              ID: {user._id.slice(-8).toUpperCase()}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: "text.secondary" }}
          aria-label="Close user details modal"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
          {/* Contact & Account Credentials Card */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: "#334155",
                mb: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <ShieldOutlinedIcon sx={{ fontSize: 18, color: "#0284c7" }} />
              Account & Credentials
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <EmailOutlinedIcon
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Email Address:
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "#0f172a" }}
                  >
                    {user.email}
                  </Typography>
                  <Tooltip title={copiedEmail ? "Copied!" : "Copy email"}>
                    <IconButton size="small" onClick={handleCopyEmail}>
                      {copiedEmail ? (
                        <CheckIcon sx={{ fontSize: 14, color: "#10b981" }} />
                      ) : (
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PhoneOutlinedIcon
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Phone Number:
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: user.phone ? "#0f172a" : "text.secondary",
                  }}
                >
                  {user.phone || "Not provided"}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <VpnKeyOutlinedIcon
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Authentication:
                  </Typography>
                </Box>
                <Chip
                  label={authLabel}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: "0.75rem" }}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CalendarTodayOutlinedIcon
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Member Since:
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "#0f172a" }}
                >
                  {user.created_at ? formatDateTime(user.created_at) : "N/A"}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  User ID:
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: "monospace",
                      fontSize: "0.8rem",
                      color: "#475569",
                    }}
                  >
                    {user._id}
                  </Typography>
                  <Tooltip title={copiedId ? "Copied!" : "Copy user ID"}>
                    <IconButton size="small" onClick={handleCopyId}>
                      {copiedId ? (
                        <CheckIcon sx={{ fontSize: 14, color: "#10b981" }} />
                      ) : (
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Saved Address / Shipping Card */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: "#334155",
                mb: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <LocationOnOutlinedIcon sx={{ fontSize: 18, color: "#f59e0b" }} />
              Shipping & Location Profile
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            {fullAddress ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {user.address && (
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ minWidth: 70 }}
                    >
                      Street:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "#0f172a" }}
                    >
                      {user.address}
                    </Typography>
                  </Box>
                )}
                {user.area && (
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ minWidth: 70 }}
                    >
                      Area:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "#0f172a" }}
                    >
                      {user.area}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ minWidth: 70 }}
                  >
                    City:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "#0f172a" }}
                  >
                    {user.city || "—"}
                    {user.province ? `, ${user.province}` : ""}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                No default shipping address saved on file yet.
              </Typography>
            )}
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          px: 2.5,
          borderTop: "1px solid #e2e8f0",
          backgroundColor: "#f8fafc",
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            textTransform: "none",
            px: 3,
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
