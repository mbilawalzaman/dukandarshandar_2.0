"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Grid,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import PlaceIcon from "@mui/icons-material/Place";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PageBanner from "../components/PageBanner";
import { useCart } from "@/app/providers/CartProvider";
import { DEFAULT_PAGE_SETTINGS, PageSettings } from "@/lib/pageSettings";

export default function ContactPage() {
  const { toast } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [settings, setSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/page-settings");
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      } catch (err) {
        console.error("Error loading contact page settings:", err);
      }
    };
    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(data.message || "Message sent");
        setForm({ name: "", email: "", subject: "", message: "" });
      } else {
        toast(data.message || "Failed to send message", "error");
      }
    } catch {
      toast("Failed to send message", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <PageBanner
        title={settings.contact.bannerTitle || "CONTACT"}
        subtitle={settings.contact.bannerSubtitle}
        bgImage={settings.contact.bannerImage}
        bgMedia={settings.contact.bannerMedia}
      />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Typography variant="h4" sx={{ mb: 2 }}>
              Get in touch
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Questions about an order, a product, or a custom craft request? Send us a message and we will reply
              as soon as we can.
            </Typography>
            <Card sx={{ mb: 2, borderRadius: 3 }}>
              <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <EmailIcon color="primary" />
                <Box>
                  <Typography fontWeight={700}>Email</Typography>
                  <Typography variant="body2" color="text.secondary">
                    hello@dukandarshandar.com
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            <Card sx={{ mb: 2, borderRadius: 3 }}>
              <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <PlaceIcon color="primary" />
                <Box>
                  <Typography fontWeight={700}>Location</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pakistan nationwide shipping
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <AccessTimeIcon color="primary" />
                <Box>
                  <Typography fontWeight={700}>Hours</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mon–Sat, 10:00 AM – 8:00 PM
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth required name="name" label="Your name" value={form.name} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth required type="email" name="email" label="Email" value={form.email} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth name="subject" label="Subject" value={form.subject} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        required
                        multiline
                        rows={5}
                        name="message"
                        label="Message"
                        value={form.message}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button type="submit" variant="contained" size="large" disabled={submitting}>
                        {submitting ? "Sending..." : "Send message"}
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
