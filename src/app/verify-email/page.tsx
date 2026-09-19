"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container, Card, CardContent, Typography, Box, CircularProgress, Button, Alert } from "@mui/material";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import { BRAND } from "@/lib/constants";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setMessage("Missing email verification token.");
      return;
    }

    fetch("/api/profile/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSuccess(true);
          setMessage(data.message || "Email address verified successfully!");
        } else {
          setSuccess(false);
          setMessage(data.message || "Failed to verify email address.");
        }
      })
      .catch(() => {
        setSuccess(false);
        setMessage("Network error verifying email address.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <Container maxWidth="xs" sx={{ mt: 10, mb: 10 }}>
      <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
        <CardContent sx={{ p: 4, textAlign: "center" }}>
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
              <MarkEmailReadIcon sx={{ fontSize: 32, color: BRAND.navy }} />
            </Box>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: BRAND.navy }}>
            Email Verification
          </Typography>

          {loading ? (
            <Box sx={{ py: 3 }}>
              <CircularProgress size={36} sx={{ color: BRAND.navy, mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Verifying your email token...
              </Typography>
            </Box>
          ) : (
            <Box>
              <Alert severity={success ? "success" : "error"} sx={{ mb: 3 }}>
                {message}
              </Alert>

              <Button
                component={Link}
                href={success ? "/profile" : "/"}
                variant="contained"
                fullWidth
                sx={{
                  py: 1.2,
                  backgroundColor: BRAND.gold,
                  color: BRAND.navy,
                  fontWeight: 700,
                  textTransform: "none",
                  "&:hover": { backgroundColor: BRAND.goldHover },
                }}
              >
                {success ? "Go to My Profile" : "Return to Home"}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
