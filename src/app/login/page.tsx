"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TextField, Button, Typography, Container, Box, Card, CardContent, Link, InputAdornment, IconButton } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const persistAuth = (token: string) => {
    localStorage.setItem("token", token);
    window.dispatchEvent(new Event("authChange"));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, type: "login" }),
    });

    const data = await res.json();
    if (data.success) {
      persistAuth(data.token);
      router.push(data.user?.role === "admin" && nextPath === "/" ? "/admin" : nextPath);
    } else {
      setError(data.error);
    }
  };

  const handleGuestLogin = async () => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "guest" }),
    });

    const data = await res.json();
    if (data.success) {
      persistAuth(data.token);
      router.push(nextPath);
    } else {
      setError(data.error);
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
              <TextField label="Email" type="email" name="email" variant="outlined" fullWidth required onChange={handleChange} />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
                variant="outlined"
                fullWidth
                required
                onChange={handleChange}
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
                <Typography color="error" align="center">
                  {error}
                </Typography>
              )}
              <Button type="submit" variant="contained" color="primary" fullWidth>
                Login
              </Button>
              <Button variant="outlined" color="secondary" fullWidth onClick={handleGuestLogin}>
                Continue as Guest
              </Button>
              <Typography align="center">
                Don&apos;t have an account?{" "}
                <Link href="/signup" color="primary">
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
