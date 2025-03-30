"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField, Button, Typography, Container, Box, Card, CardContent, Link } from "@mui/material";

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        window.dispatchEvent(new Event("authChange"));
      }

      router.push("/");
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
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        window.dispatchEvent(new Event("authChange"));
      }

      router.push("/");
    } else {
      setError(data.error);
    }
  };


  return (
    <div>
      <Container maxWidth="xs" sx={{ mt: 8 }}>
        <Card>
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
                />
                <TextField
                  label="Password"
                  type="password"
                  name="password"
                  variant="outlined"
                  fullWidth
                  required
                  onChange={handleChange}
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
                  Don not have an account?{' '}
                  <Link href="/signup" color="primary">
                    Sign Up
                  </Link>
                </Typography>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
