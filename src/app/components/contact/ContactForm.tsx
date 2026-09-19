"use client";

import { useState } from "react";
import { Grid, TextField, Button, Card, CardContent } from "@mui/material";
import { useCart } from "@/app/providers/CartProvider";

export default function ContactForm() {
  const { toast } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

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
  );
}
