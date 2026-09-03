"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function Signup() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [blockAutofill, setBlockAutofill] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const socialEnabled = isFirebaseClientConfigured();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const enableField = () => setBlockAutofill(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, type: "signup" }),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/login");
      } else {
        setError(data.error);
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
      router.push(user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Social signup failed";
      if (/popup-closed|cancelled|canceled/i.test(message)) {
        setError("Sign-in was cancelled.");
      } else {
        setError(message);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const autofillBlockProps = {
    autoComplete: "off" as const,
    readOnly: blockAutofill,
    onFocus: enableField,
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8, mb: 8 }}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h4" align="center" gutterBottom>
            Sign Up
          </Typography>
          <form onSubmit={handleSubmit} autoComplete="off">
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Full Name"
                type="text"
                name="name"
                variant="outlined"
                fullWidth
                required
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                disabled={loading || !!socialLoading}
              />
              <TextField
                label="Email"
                type="email"
                name="email"
                variant="outlined"
                fullWidth
                required
                value={formData.email}
                onChange={handleChange}
                inputProps={autofillBlockProps}
                disabled={loading || !!socialLoading}
              />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
                variant="outlined"
                fullWidth
                required
                value={formData.password}
                onChange={handleChange}
                disabled={loading || !!socialLoading}
                inputProps={{
                  ...autofillBlockProps,
                  autoComplete: "new-password",
                }}
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
              <input type="hidden" name="role" value="user" />

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
                sx={{
                  backgroundColor: BRAND.gold,
                  color: BRAND.navy,
                  fontWeight: 700,
                  "&:hover": { backgroundColor: BRAND.goldHover },
                }}
              >
                {loading && !socialLoading ? <CircularProgress size={22} color="inherit" /> : "Sign Up"}
              </Button>

              {socialEnabled && (
                <>
                  <Divider>
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
                Already have an account?{" "}
                <Link href="/login" color="primary">
                  Login
                </Link>
              </Typography>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}
