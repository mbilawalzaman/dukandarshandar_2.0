"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField, Button, Typography, Container, Box, Card, CardContent, Link } from "@mui/material";

export default function Signup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user", // ✅ Always set "user" role by default
  });
  const [error, setError] = useState("");

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, type: "signup" }), // ✅ Ensure role is sent
    });

    const data = await res.json();
    if (data.success) {
      router.push("/login");
    } else {
      setError(data.error);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Card>
        <CardContent>
          <Typography variant="h4" align="center" gutterBottom>
            Sign Up
          </Typography>
          <form onSubmit={handleSubmit}>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Full Name"
                type="text"
                name="name"
                variant="outlined"
                fullWidth
                required
                onChange={handleChange}
              />
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
              {/* ✅ Ensure role is always "user" */}
              <input type="hidden" name="role" value="user" />

              {error && (
                <Typography color="error" align="center">
                  {error}
                </Typography>
              )}
              <Button type="submit" variant="contained" color="primary" fullWidth>
                Sign Up
              </Button>
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
