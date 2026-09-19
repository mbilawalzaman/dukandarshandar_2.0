"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  InputAdornment,
  IconButton,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import KeyIcon from "@mui/icons-material/Key";
import { BRAND } from "@/lib/uiBrand";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token || !email) {
      setError("Invalid or missing password reset link parameters.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(data.message || "Failed to reset password.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 10, mb: 10 }}>
      <Card sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", backgroundColor: "background.paper" }} elevation={0}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: "var(--theme-highlight-badge-bg, rgba(254,190,76,0.15))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <KeyIcon sx={{ fontSize: 32, color: BRAND.navy }} />
            </Box>
          </Box>

          <Typography variant="h5" align="center" sx={{ fontWeight: 700, mb: 1, color: BRAND.navy }}>
            Set New Password
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Enter a new password for account: <strong>{email}</strong>
          </Typography>

          {success ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Password reset successfully! Redirecting you to login...
            </Alert>
          ) : (
            <form onSubmit={handleSubmit}>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Confirm New Password"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {loading ? <CircularProgress size={22} color="inherit" /> : "Save New Password"}
                </Button>
              </Box>
            </form>
          )}

          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Link href="/login" style={{ color: BRAND.navy, fontWeight: 600, fontSize: "0.9rem", textDecoration: "none" }}>
              Return to Login
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
