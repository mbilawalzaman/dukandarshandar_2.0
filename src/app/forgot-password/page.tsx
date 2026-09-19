"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LockResetIcon from "@mui/icons-material/LockReset";
import { BRAND } from "@/lib/constants";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const { settings } = useDeliverySettings();
  const shopName = settings.shopName || "Ecommerce Store";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      const errMsg = "Please enter your email address.";
      setError(errMsg);
      setToastOpen(true);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message || `Password reset instructions have been sent to ${trimmedEmail}.`);
        setToastOpen(true);
      } else {
        const errMsg = data.message || `Not a registered email on ${shopName}`;
        setError(errMsg);
        setToastOpen(true);
      }
    } catch {
      const errMsg = "Network error. Please try again.";
      setError(errMsg);
      setToastOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 10, mb: 10 }}>
      <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: "rgba(254,190,76,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LockResetIcon sx={{ fontSize: 32, color: BRAND.navy }} />
            </Box>
          </Box>

          <Typography variant="h5" align="center" sx={{ fontWeight: 700, mb: 1, color: BRAND.navy }}>
            Forgot Password?
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Enter your registered email address below and we will send you instructions to reset your password.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {message && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              {message}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Email address"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                  if (message) setMessage("");
                }}
                disabled={loading}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{
                  py: 1.2,
                  backgroundColor: BRAND.gold,
                  color: BRAND.navy,
                  fontWeight: 700,
                  textTransform: "none",
                  fontSize: "0.95rem",
                  "&:hover": { backgroundColor: BRAND.goldHover },
                }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : "Send Reset Link"}
              </Button>
            </Box>
          </form>

          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: BRAND.navy,
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none",
              }}
            >
              <ArrowBackIcon fontSize="small" /> Back to Login
            </Link>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToastOpen(false)}
          severity={error ? "error" : "success"}
          variant="filled"
          sx={{ width: "100%", color: "#fff", fontWeight: 600 }}
        >
          {error || message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

