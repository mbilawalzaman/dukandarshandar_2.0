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
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const enableField = () => setBlockAutofill(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

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
  };

  const autofillBlockProps = {
    autoComplete: "off" as const,
    readOnly: blockAutofill,
    onFocus: enableField,
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Card>
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
