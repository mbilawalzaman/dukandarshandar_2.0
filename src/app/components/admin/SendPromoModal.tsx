"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Checkbox,
  InputAdornment,
  Avatar,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import SendIcon from "@mui/icons-material/Send";
import { authHeaders } from "@/lib/cart";
import type { Promotion, SendPromoEmailInput } from "@/types/apps/promotionTypes";
import { rewardLabel } from "@/lib/promotionDisplay";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

interface SendPromoModalProps {
  open: boolean;
  onClose: () => void;
  promotion: Promotion | null;
  onSuccess?: () => void;
}

const SEGMENTS: Array<{ value: NonNullable<SendPromoEmailInput["segment"]>; label: string }> = [
  { value: "none", label: "No segment (pick users below)" },
  { value: "all_users", label: "All registered customers" },
  { value: "with_orders", label: "Customers who have ordered" },
  { value: "inactive_30d", label: "No order in the last 30 days" },
  { value: "subscribers", label: "Newsletter subscribers" },
];

const AVATAR_COLORS = ["#e11d48", "#7c3aed", "#0284c7", "#059669", "#d97706", "#4f46e5", "#db2777"];

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function SendPromoModal({ open, onClose, promotion, onSuccess }: SendPromoModalProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  
  const [manualInput, setManualInput] = useState("");
  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [segment, setSegment] = useState<NonNullable<SendPromoEmailInput["segment"]>>("none");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch users when modal opens
  useEffect(() => {
    if (open) {
      setError("");
      setSuccessMessage("");
      setSelectedUserIds(new Set());
      setManualEmails([]);
      setManualInput("");
      setSearchQuery("");
      setCustomMessage("");
      setSegment("none");
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch("/api/users", {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch users for promo email:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) => (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleAddManualEmail = (emailStr: string) => {
    const rawEmails = emailStr.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
    const validEmails = rawEmails.filter((e) => e.includes("@") && !manualEmails.includes(e));

    if (validEmails.length > 0) {
      setManualEmails((prev) => [...prev, ...validEmails]);
      setManualInput("");
    }
  };

  const handleRemoveManualEmail = (emailToRemove: string) => {
    setManualEmails((prev) => prev.filter((e) => e !== emailToRemove));
  };

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === ",") {
      e.preventDefault();
      handleAddManualEmail(manualInput);
    }
  };

  const totalRecipientsCount = selectedUserIds.size + manualEmails.length;
  const canSend = totalRecipientsCount > 0 || segment !== "none";

  const handleSendEmails = async () => {
    if (!promotion?._id) return;
    if (!canSend) {
      setError("Pick a segment, select registered users, or enter an email address.");
      return;
    }

    setSending(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/admin/promotions/${promotion._id}/send-email`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          manualEmails,
          segment,
          customMessage,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(data.message || `Successfully sent promo code to ${data.sentCount} recipients!`);
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setError(data.error || "Failed to send promo emails");
      }
    } catch (err) {
      console.error("Error sending promo email:", err);
      setError("An unexpected error occurred while sending emails.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
      <DialogTitle component="div" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 0.5, color: "#0f172a" }}>
            SEND PROMO EMAIL
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select users or enter email addresses manually.
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: "#64748b" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, py: 2.5 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {successMessage && <Alert severity="success">{successMessage}</Alert>}

        {promotion && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: "#f8fafc",
              border: "1px dashed #cbd5e1",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                Promo Code
              </Typography>
              <Typography variant="h6" fontWeight={800} color="#0f172a">
                {promotion.code}
              </Typography>
            </Box>
            <Chip
              label={rewardLabel(promotion.reward)}
              sx={{ backgroundColor: "#febe4c", color: "#0f172a", fontWeight: 700 }}
            />
          </Paper>
        )}

        {/* Recipients Header */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} color="#334155">
            Recipients
          </Typography>

          <TextField select fullWidth size="small" label="Customer segment" value={segment} onChange={(e) => setSegment(e.target.value as typeof segment)}>
            {SEGMENTS.map((s) => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
            ))}
          </TextField>

          {/* Manual Emails Input */}
          <TextField
            fullWidth
            size="small"
            placeholder="Enter emails manually, paste lists, press Space or Enter..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={handleManualKeyDown}
            onBlur={() => handleAddManualEmail(manualInput)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Manual Email Chips */}
          {manualEmails.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {manualEmails.map((email) => (
                <Chip
                  key={email}
                  label={email}
                  size="small"
                  onDelete={() => handleRemoveManualEmail(email)}
                  sx={{ backgroundColor: "#e2e8f0", color: "#1e293b", fontWeight: 500 }}
                />
              ))}
            </Box>
          )}

          {/* Search Existing Users */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search existing users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />

          {/* User List Box */}
          <Paper
            variant="outlined"
            sx={{
              maxHeight: 220,
              overflowY: "auto",
              borderRadius: 2,
              borderColor: "#e2e8f0",
              p: 0.5,
            }}
          >
            {loadingUsers ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : filteredUsers.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                No users found.
              </Typography>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUserIds.has(user._id);
                const initials = getInitials(user.name);
                const bg = getAvatarColor(user.email || user._id);

                return (
                  <Box
                    key={user._id}
                    onClick={() => handleToggleUser(user._id)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.2,
                      px: 1.5,
                      borderRadius: 1.5,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      backgroundColor: isSelected ? "rgba(56, 189, 248, 0.08)" : "transparent",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: bg, width: 36, height: 36, fontSize: "0.85rem", fontWeight: 700 }}>
                        {initials}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="#0f172a">
                          {user.name || "Customer"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                    <Checkbox checked={isSelected} size="small" sx={{ color: "#cbd5e1" }} />
                  </Box>
                );
              })
            )}
          </Paper>

          {/* Custom Message Field */}
          <TextField
            fullWidth
            multiline
            rows={2}
            size="small"
            label="Optional Note / Message"
            placeholder="Add a personalized message included in the promo email..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1.5, justifyContent: "flex-end", gap: 1.5 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, textTransform: "none", color: "#475569" }}>
          Cancel
        </Button>
        <Button
          onClick={handleSendEmails}
          variant="contained"
          disabled={sending || !canSend}
          startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
          sx={{
            borderRadius: "24px",
            px: 3,
            py: 1,
            textTransform: "none",
            fontWeight: 700,
            backgroundColor: "#dc2626",
            color: "#ffffff",
            "&:hover": { backgroundColor: "#b91c1c", color: "#ffffff" },
          }}
        >
          {sending ? "Sending..." : segment !== "none" ? `Send to segment${totalRecipientsCount ? ` + ${totalRecipientsCount}` : ""}` : `Send to ${totalRecipientsCount} recipient${totalRecipientsCount === 1 ? "" : "s"}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
