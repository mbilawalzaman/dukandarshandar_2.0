"use client";

import React, { useCallback, useEffect, useState } from "react";

import {
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { BRAND } from "@/lib/uiBrand";

export interface PickupAddress {
  addressCode?: string;
  address?: string;
  cityName?: string;
  contactPersonName?: string;
  phone1?: string;
  phone2?: string;
  phone3?: string;
  wareHouseManagerName?: string;
  addressTypeId?: number;
  isDefault?: boolean;
}

interface PostExWarehouseSectionProps {
  onError?: (msg: string) => void;
}

export default function PostExWarehouseSection({
  onError,
}: PostExWarehouseSectionProps) {
  const [addresses, setAddresses] = useState<PickupAddress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState<boolean>(false);

  // Form State
  const [form, setForm] = useState({
    contactPersonName: "",
    cityName: "",
    address: "",
    phone1: "",
    phone2: "",
    wareHouseManagerName: "",
    addressTypeId: 2, // 2 = Pickup, 1 = Return
  });

  const authHeaders = useCallback(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/postex/pickup-addresses", {
        headers: authHeaders(),
      });

      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const list = Array.isArray(data.data.dist)
          ? data.data.dist
          : Array.isArray(data.data)
            ? data.data
            : [];

        setAddresses(list);
      } else {
        setAddresses([]);
      }
    } catch {
      setErrorMsg("Failed to load PostEx pickup addresses");
      if (onError) onError("Failed to load PostEx pickup addresses");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, onError]);

  const fetchCities = useCallback(async () => {
    if (cities.length > 0) return;
    setCitiesLoading(true);

    try {
      const res = await fetch("/api/admin/postex/cities?type=Pickup", {
        headers: authHeaders(),
      });

      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const rawList = Array.isArray(data.data.dist)
          ? data.data.dist
          : Array.isArray(data.data)
            ? data.data
            : [];

        const cityNames: string[] = rawList
          .map(
            (c: {
              cityName?: string;
              operationalCityName?: string;
              name?: string;
            }) => c.cityName || c.operationalCityName || c.name || "",
          )
          .filter(Boolean)
          .sort();

        setCities(Array.from(new Set(cityNames)));
      }
    } catch {
      /* fallback to standard text input if city fetch fails */
    } finally {
      setCitiesLoading(false);
    }
  }, [authHeaders, cities.length]);

  useEffect(() => {
    void fetchAddresses();
  }, [fetchAddresses]);

  const handleOpenDialog = () => {
    setErrorMsg("");
    setSuccessMsg("");
    setForm({
      contactPersonName: "",
      cityName: "",
      address: "",
      phone1: "",
      phone2: "",
      wareHouseManagerName: "",
      addressTypeId: 2,
    });
    setDialogOpen(true);
    void fetchCities();
  };

  const handlePhoneChange = (field: "phone1" | "phone2", value: string) => {
    let cleaned = value.replace(/\D/g, "");

    if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);
    setForm((prev) => ({ ...prev, [field]: cleaned }));
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!form.contactPersonName.trim()) {
      setErrorMsg("Contact Person Name is required");

      return;
    }

    if (!form.cityName.trim()) {
      setErrorMsg("City Name is required");

      return;
    }

    if (!form.address.trim()) {
      setErrorMsg("Street Address is required");

      return;
    }

    if (!form.phone1.trim() || !/^03\d{9}$/.test(form.phone1.trim())) {
      setErrorMsg(
        "Phone 1 must be 11 digits starting with 03 (e.g. 03234111111)",
      );

      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/postex/pickup-addresses", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          contactPersonName: form.contactPersonName.trim(),
          cityName: form.cityName.trim(),
          address: form.address.trim(),
          phone1: form.phone1.trim(),
          phone2: form.phone2.trim(),
          wareHouseManagerName: form.wareHouseManagerName.trim(),
          addressTypeId: form.addressTypeId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Failed to register PostEx warehouse address",
        );
      }

      setSuccessMsg(
        "Merchant Warehouse Address registered successfully with PostEx!",
      );
      void fetchAddresses();
      setTimeout(() => {
        setDialogOpen(false);
      }, 1200);
    } catch (err: unknown) {
      const errorObj = err as Error;

      setErrorMsg(
        errorObj.message || "Failed to register PostEx warehouse address",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, sm: 3.5 },
        borderRadius: 3,
        border: "1px solid #e2e8f0",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Section Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2.5,
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <WarehouseIcon sx={{ color: BRAND.gold, fontSize: 28 }} />
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, color: BRAND.navy }}
            >
              PostEx Merchant Warehouses & Pickup Locations
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Registered warehouse addresses used as dispatch origin for PostEx
              courier bookings.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void fetchAddresses()}
            disabled={loading}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Refresh
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              backgroundColor: BRAND.gold,
              color: BRAND.navy,
              "&:hover": { backgroundColor: BRAND.goldHover },
            }}
          >
            Register Warehouse
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 2.5 }} />

      {/* Address List Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : addresses.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No PostEx merchant pickup addresses registered yet. Click
          &quot;Register Warehouse&quot; to add your pickup origin code.
        </Alert>
      ) : (
        <TableContainer sx={{ borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <Table size="small">
            <TableHead
              sx={{ backgroundColor: "var(--theme-bg-default, #f8fafc)" }}
            >
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>City</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact Person</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  Warehouse Address
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {addresses.map((addr, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>
                    <Chip
                      label={addr.addressCode || "001"}
                      size="small"
                      color={addr.addressCode === "001" ? "primary" : "default"}
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: BRAND.navy }}>
                    {addr.cityName || "—"}
                  </TableCell>
                  <TableCell>{addr.contactPersonName || "—"}</TableCell>
                  <TableCell
                    sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                  >
                    {addr.phone1 || "—"}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        fontSize: "0.85rem",
                      }}
                    >
                      {addr.address || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<CheckCircleIcon fontSize="small" />}
                      label={
                        addr.addressTypeId === 1
                          ? "Return Origin"
                          : "Pickup Warehouse"
                      }
                      size="small"
                      variant="outlined"
                      color={addr.addressTypeId === 1 ? "warning" : "success"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog for Registering New Warehouse */}
      <Dialog
        open={dialogOpen}
        onClose={submitting ? undefined : () => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: BRAND.navy }}>
          Register PostEx Merchant Warehouse
        </DialogTitle>
        <form onSubmit={handleCreateAddress}>
          <DialogContent>
            {errorMsg && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {errorMsg}
              </Alert>
            )}
            {successMsg && (
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                {successMsg}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Contact Person Name"
                  placeholder="e.g. Imran Khan"
                  value={form.contactPersonName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      contactPersonName: e.target.value,
                    }))
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                {cities.length > 0 ? (
                  <FormControl fullWidth required>
                    <InputLabel>Operational City</InputLabel>
                    <Select
                      value={form.cityName}
                      label="Operational City"
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          cityName: e.target.value,
                        }))
                      }
                    >
                      {cities.map((city) => (
                        <MenuItem key={city} value={city}>
                          {city}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    fullWidth
                    required
                    label="Operational City Name"
                    placeholder="e.g. Lahore"
                    value={form.cityName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, cityName: e.target.value }))
                    }
                    helperText={
                      citiesLoading ? "Loading PostEx cities..." : undefined
                    }
                  />
                )}
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Warehouse Street Address"
                  placeholder="e.g. House# 34-B, Prime Homes, Nishtar Colony, Ferozpur Road"
                  value={form.address}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Phone 1 (Primary)"
                  placeholder="03234111111"
                  helperText="Must be 11 digits (03XXXXXXXXX)"
                  value={form.phone1}
                  onChange={(e) => handlePhoneChange("phone1", e.target.value)}
                  inputProps={{ maxLength: 11, inputMode: "numeric" }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone 2 (Optional)"
                  placeholder="03001234567"
                  value={form.phone2}
                  onChange={(e) => handlePhoneChange("phone2", e.target.value)}
                  inputProps={{ maxLength: 11, inputMode: "numeric" }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Warehouse Manager Name"
                  placeholder="e.g. Manager Name"
                  value={form.wareHouseManagerName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      wareHouseManagerName: e.target.value,
                    }))
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Address Type</InputLabel>
                  <Select
                    value={form.addressTypeId}
                    label="Address Type"
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        addressTypeId: Number(e.target.value),
                      }))
                    }
                  >
                    <MenuItem value={2}>Pickup Warehouse Origin</MenuItem>
                    <MenuItem value={1}>Return Origin Warehouse</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={
                submitting ? <CircularProgress size={18} /> : <AddIcon />
              }
              sx={{
                textTransform: "none",
                fontWeight: 700,
                backgroundColor: BRAND.gold,
                color: BRAND.navy,
                "&:hover": { backgroundColor: BRAND.goldHover },
              }}
            >
              {submitting ? "Registering..." : "Register Address"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
}
