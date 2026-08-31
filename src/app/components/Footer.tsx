"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Link as MuiLink,
} from "@mui/material";
import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { useCart } from "@/app/providers/CartProvider";

export default function Footer() {
  const [email, setEmail] = useState("");
  const { toast } = useCart();
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast("Thanks for subscribing!");
        setEmail("");
      } else {
        toast(data.message || "Could not subscribe", "error");
      }
    } catch {
      toast("Could not subscribe", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="footer" sx={{ mt: 8, backgroundColor: BRAND.footer, color: "#fff" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              Visit our website and enjoy fast shipping
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", mb: 2 }}>
              Discover stationery, craft supplies, and hassle-free shopping at Dukandar Shandar.
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <MuiLink component={Link} href="/shop" color="inherit" underline="hover">
                Shop
              </MuiLink>
              <MuiLink component={Link} href="/about" color="inherit" underline="hover">
                About
              </MuiLink>
              <MuiLink component={Link} href="/contact" color="inherit" underline="hover">
                Contact
              </MuiLink>
              <MuiLink component={Link} href="/blog" color="inherit" underline="hover">
                Blog
              </MuiLink>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box component="form" onSubmit={handleSubscribe} sx={{ display: "flex", width: "100%" }}>
              <TextField
                fullWidth
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="small"
                sx={{
                  bgcolor: "#fff",
                  borderTopLeftRadius: 6,
                  borderBottomLeftRadius: 6,
                  "& fieldset": { border: "none" },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                sx={{
                  borderRadius: "0 6px 6px 0",
                  px: 3,
                  whiteSpace: "nowrap",
                  backgroundColor: BRAND.goldHover,
                  color: "#fff",
                  "&:hover": { backgroundColor: BRAND.goldDark, color: "#fff" },
                }}
              >
                Subscribe
              </Button>
            </Box>
          </Grid>
        </Grid>
        <Typography variant="caption" sx={{ display: "block", mt: 4, color: "rgba(255,255,255,0.5)" }}>
          © {new Date().getFullYear()} Dukandar Shandar. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}
