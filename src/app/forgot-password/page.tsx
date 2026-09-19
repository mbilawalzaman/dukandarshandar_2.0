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
  const { settings } = useDeliverySettings();
  const shopName = settings.shopName || "our store";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(
          `If ${email.trim()} is registered at ${shopName}, password reset instructions have been sent. If you do not receive an email, check the address or create an account first.`
        );
      } else {
        setError(data.message || "Could not process password reset request.");
      }
    } catch {
      setError("Network error. Please try again.");
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

          {message ? (
            <Alert
              severity="info"
              sx={{ mb: 3 }}
              action={
                <Button component={Link} href="/signup" color="inherit" size="small" sx={{ whiteSpace: "nowrap" }}>
                  Sign up
                </Button>
              }
            >
              {message}
            </Alert>
          ) : (
            <form onSubmit={handleSubmit}>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  label="Email address"
                  type="email"
                  fullWidth
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                {error && (
                  <Typography color="error" variant="body2" align="center">
                    {error}
                  </Typography>
                )}
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
          )}

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
    </Container>
  );
}
