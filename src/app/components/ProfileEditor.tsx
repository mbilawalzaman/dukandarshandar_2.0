"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SaveIcon from "@mui/icons-material/Save";
import UserAvatar from "@/app/components/ui/UserAvatar";
import { authFetch, persistAccessToken } from "@/lib/authFetch";
import { BRAND } from "@/lib/constants";
import { isValidCustomerEmail } from "@/lib/userDisplay";
import type { ProfileData, ProfileEditorProps } from "@/types/apps/profileTypes";

export type { ProfileData };

export default function ProfileEditor({
  loginNextPath = "/profile",
  showDelivery = true,
}: ProfileEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    image: "",
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/api/profile");
      const data = await res.json();
      if (res.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(loginNextPath)}`);
        return;
      }
      if (res.status === 403) {
        setError(data.message || "Please sign in with a full account to manage your profile.");
        setProfile(null);
        return;
      }
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to load profile");
        return;
      }
      const p = data.profile as ProfileData;
      setProfile(p);
      setForm({
        name: p.name || "",
        email: p.email || "",
        phone: p.phone || "",
        city: p.city || "",
        address: p.address || "",
        image: p.image || "",
      });
      if (p.image) localStorage.setItem("userImage", p.image);
      else localStorage.removeItem("userImage");
      window.dispatchEvent(new Event("authChange"));
    } catch {
      setError("Network error loading profile");
    } finally {
      setLoading(false);
    }
  }, [router, loginNextPath]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess("");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("Image must be under 3MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image: String(reader.result || "") }));
      setSuccess("");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!isValidCustomerEmail(form.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          image: form.image,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to save profile");
        return;
      }
      if (data.token) {
        persistAccessToken(data.token);
      }
      const p = data.profile as ProfileData;
      setProfile(p);
      setForm({
        name: p.name || "",
        email: p.email || "",
        phone: p.phone || "",
        city: p.city || "",
        address: p.address || "",
        image: p.image || "",
      });
      if (p.image) localStorage.setItem("userImage", p.image);
      else localStorage.removeItem("userImage");
      window.dispatchEvent(new Event("authChange"));
      setSuccess("Profile saved");
    } catch {
      setError("Network error while saving");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress sx={{ color: BRAND.gold }} />
      </Box>
    );
  }

  if (error && !profile) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        {error}
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={() => router.push(`/login?next=${encodeURIComponent(loginNextPath)}`)}
            sx={{ backgroundColor: BRAND.gold, color: BRAND.navy }}
          >
            Log in
          </Button>
        </Box>
      </Alert>
    );
  }

  return (
    <Paper
      component="form"
      onSubmit={handleSave}
      sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3, border: "1px solid #e2e8f0" }}
      elevation={0}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <UserAvatar
          user={{ name: form.name, email: form.email, image: form.image, role: profile?.role }}
          size={72}
        />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND.navy }}>
            {form.name || "Your profile"}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
            <Chip size="small" label={profile?.role || "user"} />
            <Chip size="small" variant="outlined" label={profile?.authProvider || "password"} />
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
        Login details
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth required name="name" label="Full name" value={form.name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            type="email"
            name="email"
            label="Email"
            value={form.email}
            onChange={handleChange}
            helperText={
              profile?.needsEmail
                ? "Add your email for order updates (Facebook did not share one)"
                : "Used for login and order receipts"
            }
          />
        </Grid>
        <Grid item xs={12}>
          <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} sx={{ textTransform: "none" }}>
            Upload profile photo
            <input type="file" hidden accept="image/*" onChange={handleImageSelect} />
          </Button>
          {form.image && (
            <Button
              sx={{ ml: 1, textTransform: "none" }}
              color="inherit"
              onClick={() => setForm((prev) => ({ ...prev, image: "" }))}
            >
              Remove photo
            </Button>
          )}
        </Grid>
      </Grid>

      {showDelivery && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Delivery address
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="phone" label="Phone" value={form.phone} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="city" label="City" value={form.city} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="address"
                label="Address"
                value={form.address}
                onChange={handleChange}
                multiline
                minRows={2}
              />
            </Grid>
          </Grid>
        </>
      )}

      <Button
        type="submit"
        variant="contained"
        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
        disabled={saving}
        sx={{
          textTransform: "none",
          fontWeight: 700,
          backgroundColor: BRAND.gold,
          color: BRAND.navy,
          px: 3,
          "&:hover": { backgroundColor: BRAND.goldHover },
        }}
      >
        Save profile
      </Button>
    </Paper>
  );
}
