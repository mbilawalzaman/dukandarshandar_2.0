"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TextField,
  Button,
  Typography,
  Container,
  Box,
  Card,
  CardContent,
  Link,
  InputAdornment,
  IconButton,
  Divider,
  CircularProgress,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import GoogleIcon from "@mui/icons-material/Google";
import FacebookIcon from "@mui/icons-material/Facebook";
import { isFirebaseClientConfigured } from "@/lib/firebaseConfig";
import { persistAccessToken } from "@/lib/authFetch";
import { signInWithSocial, type SocialProvider } from "@/lib/socialAuth";
import { BRAND } from "@/lib/constants";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || searchParams.get("redirect") || "/";
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const socialEnabled = isFirebaseClientConfigured();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const redirectAfterLogin = (role?: string) => {
    router.push(role === "admin" && nextPath === "/" ? "/admin" : nextPath);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...formData, type: "login" }),
      });

      const raw = await res.text();
      let data: { success?: boolean; token?: string; user?: { role?: string }; error?: string };
      try {
        data = JSON.parse(raw);
      } catch {
        setError(
          res.status >= 500
            ? "Server error check that DATABASE_URL and JWT_SECRET are set on Vercel."
            : "Unexpected server response. Please try again."
        );
        return;
      }

      if (data.success && data.token) {
        persistAccessToken(data.token);
        redirectAfterLogin(data.user?.role);
      } else {
        setError(data.error || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "guest" }),
      });

      const raw = await res.text();
      let data: { success?: boolean; token?: string; error?: string };
      try {
        data = JSON.parse(raw);
      } catch {
        setError("Server error check that Vercel environment variables.");
        return;
      }

      if (data.success && data.token) {
        persistAccessToken(data.token);
        router.push(nextPath);
      } else {
        setError(data.error || "Guest login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = async (provider: SocialProvider) => {
    setError("");
    setSocialLoading(provider);
    try {
      const { token, user } = await signInWithSocial(provider);
      persistAccessToken(token);
      redirectAfterLogin(user.role);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Social login failed";
      // Popup closed by user — keep quiet-ish
      if (/popup-closed|cancelled|canceled/i.test(message)) {
        setError("Sign-in was cancelled.");
      } else {
        setError(message);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8, mb: 8 }}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h4" align="center" gutterBottom>
            Login
          </Typography>
          <form onSubmit={handleSubmit}>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Email"
                type="email"
                name="email"
                variant="outlined"
                fullWidth
                required
                onChange={handleChange}
                disabled={loading || !!socialLoading}
              />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
                variant="outlined"
                fullWidth
                required
                onChange={handleChange}
                disabled={loading || !!socialLoading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((v) => !v)}
                        onMouseDown={(e) => e.preventDefault()}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {error && (
                <Typography color="error" align="center" variant="body2">
                  {error}
                </Typography>
              )}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={loading || !!socialLoading}
                sx={{ backgroundColor: BRAND.gold, color: BRAND.navy, fontWeight: 700, "&:hover": { backgroundColor: BRAND.goldHover } }}
              >
                {loading && !socialLoading ? <CircularProgress size={22} color="inherit" /> : "Login"}
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                fullWidth
                onClick={handleGuestLogin}
                disabled={loading || !!socialLoading}
              >
                Continue as Guest
              </Button>

              {socialEnabled && (
                <>
                  <Divider sx={{ my: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      or continue with
                    </Typography>
                  </Divider>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={socialLoading === "google" ? <CircularProgress size={18} /> : <GoogleIcon />}
                    onClick={() => handleSocial("google")}
                    disabled={loading || !!socialLoading}
                    sx={{ textTransform: "none", fontWeight: 600, borderColor: "#dadce0", color: "#3c4043" }}
                  >
                    Continue with Google
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={socialLoading === "facebook" ? <CircularProgress size={18} /> : <FacebookIcon />}
                    onClick={() => handleSocial("facebook")}
                    disabled={loading || !!socialLoading}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      borderColor: "#1877F2",
                      color: "#1877F2",
                    }}
                  >
                    Continue with Facebook
                  </Button>
                </>
              )}

              <Typography align="center">
                Don&apos;t have an account?{" "}
                <Link href={nextPath !== "/" ? `/signup?next=${encodeURIComponent(nextPath)}` : "/signup"} color="primary">
                  Sign Up
                </Link>
              </Typography>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}

export default function Login() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
