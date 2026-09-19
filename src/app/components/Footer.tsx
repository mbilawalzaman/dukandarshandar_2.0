"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  IconButton,
  Link as MuiLink,
} from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import YouTubeIcon from "@mui/icons-material/YouTube";
import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { useCart } from "@/app/providers/CartProvider";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";

export default function Footer() {
  const [email, setEmail] = useState("");
  const { toast } = useCart();
  const { settings } = useDeliverySettings();
  const [submitting, setSubmitting] = useState(false);

  const storeName = settings.shopName || "";
  const social = settings.socialLinks || {};

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
              Discover stationery, craft supplies, and hassle free shopping{storeName ? ` at ${storeName}` : ""}.
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
              <MuiLink component={Link} href="/shop" color="inherit" underline="hover">
                Shop
              </MuiLink>
              <MuiLink component={Link} href="/about" color="inherit" underline="hover">
                About
              </MuiLink>
              <MuiLink component={Link} href="/contact" color="inherit" underline="hover">
                Contact
              </MuiLink>

              {/* Social Link Icons */}
              <Box sx={{ display: "flex", gap: 1, ml: { xs: 0, sm: 2 } }}>
                {social.instagram && (
                  <IconButton
                    component="a"
                    href={social.instagram.startsWith("http") ? social.instagram : `https://${social.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    sx={{ color: "#fff", "&:hover": { color: "#E4405F", backgroundColor: "rgba(255,255,255,0.1)" } }}
                  >
                    <InstagramIcon fontSize="small" />
                  </IconButton>
                )}
                {social.facebook && (
                  <IconButton
                    component="a"
                    href={social.facebook.startsWith("http") ? social.facebook : `https://${social.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    sx={{ color: "#fff", "&:hover": { color: "#1877F2", backgroundColor: "rgba(255,255,255,0.1)" } }}
                  >
                    <FacebookIcon fontSize="small" />
                  </IconButton>
                )}
                {social.youtube && (
                  <IconButton
                    component="a"
                    href={social.youtube.startsWith("http") ? social.youtube : `https://${social.youtube}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    sx={{ color: "#fff", "&:hover": { color: "#FF0000", backgroundColor: "rgba(255,255,255,0.1)" } }}
                  >
                    <YouTubeIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>

            {/* Customer Policy Pages */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", fontSize: "0.825rem", color: "rgba(255,255,255,0.65)" }}>
              <MuiLink component={Link} href="/privacy-policy" color="inherit" underline="hover">
                Privacy Policy
              </MuiLink>
              <MuiLink component={Link} href="/terms-of-service" color="inherit" underline="hover">
                Terms of Service
              </MuiLink>
              <MuiLink component={Link} href="/shipping-policy" color="inherit" underline="hover">
                Shipping Policy
              </MuiLink>
              <MuiLink component={Link} href="/returns-and-refunds" color="inherit" underline="hover">
                Returns &amp; Refunds
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
          © {new Date().getFullYear()} {storeName}. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}
