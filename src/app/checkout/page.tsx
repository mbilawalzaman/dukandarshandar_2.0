"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Paper,
  Divider,
} from "@mui/material";
import { jwtDecode } from "jwt-decode";
import PageBanner from "../components/PageBanner";
import { useCart } from "@/app/providers/CartProvider";
import { authHeaders } from "@/lib/cart";
import { SHIPPING_FEE } from "@/lib/constants";

type TokenUser = { userName?: string; email?: string };

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear, toast } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    phone: "",
    address: "",
    city: "",
  });

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const decoded: TokenUser = jwtDecode(token);
        setForm((prev) => ({
          ...prev,
          customer_name: decoded.userName || "",
          customer_email: decoded.email || "",
        }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 0 ? SHIPPING_FEE : 0;
  const grandTotal = subtotal + shipping;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast("Your cart is empty", "error");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          items,
          total_amount: grandTotal,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        clear();
        toast("Order placed successfully!");
        router.push("/orders?placed=1");
      } else {
        toast(data.message || "Checkout failed", "error");
      }
    } catch {
      toast("Checkout failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ backgroundColor: "#f8fafc", minHeight: "70vh" }}>
      <PageBanner title="Checkout" subtitle="Confirm your details and place the order" />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {items.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: "center", borderRadius: 4 }}>
            <Typography sx={{ mb: 2 }}>Your cart is empty.</Typography>
            <Button variant="contained" onClick={() => router.push("/shop")}>
              Continue shopping
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={4} component="form" onSubmit={handleSubmit}>
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 4, borderRadius: 4 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Shipping details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth required name="customer_name" label="Full name" value={form.customer_name} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth required type="email" name="customer_email" label="Email" value={form.customer_email} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth required name="phone" label="Phone" value={form.phone} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth required name="city" label="City" value={form.city} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth required name="address" label="Address" value={form.address} onChange={handleChange} />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 4, borderRadius: 4 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Order summary
                </Typography>
                {items.map((item) => (
                  <Box key={item._id} sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2">
                      {item.name} × {item.quantity}
                    </Typography>
                    <Typography variant="body2">PKR {(item.price * item.quantity).toLocaleString()}</Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography color="text.secondary">Shipping</Typography>
                  <Typography>PKR {shipping.toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
                  <Typography fontWeight={800}>Total</Typography>
                  <Typography fontWeight={800} color="primary">
                    PKR {grandTotal.toLocaleString()}
                  </Typography>
                </Box>
                <Button type="submit" variant="contained" fullWidth size="large" disabled={submitting}>
                  {submitting ? "Placing order..." : "Place order"}
                </Button>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
}
