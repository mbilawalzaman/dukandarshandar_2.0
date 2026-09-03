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
  Alert,
} from "@mui/material";
import { jwtDecode } from "jwt-decode";
import PageBanner from "../components/PageBanner";
import SafepayPaymentForm from "../components/checkout/SafepayPaymentForm";
import PaymentMethodSelector, { PaymentMethod } from "../components/checkout/PaymentMethodSelector";
import { useCart } from "@/app/providers/CartProvider";
import { authHeaders } from "@/lib/cart";
import { BRAND } from "@/lib/constants";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";
import FreeDeliveryPromoBanner from "../components/FreeDeliveryPromoBanner";
import DeliveryShippingLine from "../components/DeliveryShippingLine";
import { authFetch, persistAccessToken } from "@/lib/authFetch";
import { isSyntheticEmail, isValidCustomerEmail } from "@/lib/userDisplay";

type TokenUser = { userName?: string; email?: string; userId?: string; role?: string };

interface SafepaySession {
  tracker: string;
  clientToken: string;
  orderId: string;
  environment: "sandbox" | "production";
  checkoutUrl?: string;
  paymentMethod?: PaymentMethod;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear, toast } = useCart();
  const { settings, getShipping, isPromoActive } = useDeliverySettings();
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [paymentSession, setPaymentSession] = useState<SafepaySession | null>(null);
  const [emailRequiredHint, setEmailRequiredHint] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    phone: "",
    address: "",
    city: "",
  });

  const safepayEnabled =
    process.env.NEXT_PUBLIC_SAFEPAY_ENV === "sandbox" || process.env.NEXT_PUBLIC_SAFEPAY_ENV === "production";

  useEffect(() => {
    void (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const decoded: TokenUser = jwtDecode(token);
        const tokenEmail = decoded.email || "";
        const needsRealEmail = isSyntheticEmail(tokenEmail);

        setForm((prev) => ({
          ...prev,
          customer_name: decoded.userName || prev.customer_name,
          customer_email: needsRealEmail ? "" : tokenEmail || prev.customer_email,
        }));
        setEmailRequiredHint(needsRealEmail);

        if (decoded.role === "guest" || !decoded.userId || decoded.userId === "guest") return;

        const res = await authFetch("/api/profile");
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success || !data.profile) return;

        const p = data.profile as {
          name?: string;
          email?: string;
          phone?: string;
          address?: string;
          city?: string;
          needsEmail?: boolean;
          image?: string;
        };
        setEmailRequiredHint(Boolean(p.needsEmail) || needsRealEmail);
        setForm((prev) => ({
          customer_name: p.name || prev.customer_name,
          customer_email: p.email || (needsRealEmail ? "" : prev.customer_email),
          phone: p.phone || prev.phone,
          address: p.address || prev.address,
          city: p.city || prev.city,
        }));
        if (p.image) localStorage.setItem("userImage", p.image);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = getShipping(subtotal);
  const promoActive = isPromoActive(subtotal);
  const grandTotal = subtotal + shipping;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setPaymentSession(null);
  };

  const validateForm = (): boolean => {
    if (!form.customer_name || !form.phone || !form.address || !form.city) {
      toast("Please fill in all shipping fields", "error");
      return false;
    }
    if (!isValidCustomerEmail(form.customer_email)) {
      toast("Please enter a valid email address for order updates", "error");
      return false;
    }
    if (items.length === 0) {
      toast("Your cart is empty", "error");
      return false;
    }
    return true;
  };

  const syncShippingToProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const decoded: TokenUser = jwtDecode(token);
      if (!decoded.userId || decoded.userId === "guest" || decoded.role === "guest") return;

      const res = await authFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: form.customer_name.trim(),
          email: form.customer_email.trim().toLowerCase(),
          phone: form.phone.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) persistAccessToken(data.token);
        setEmailRequiredHint(false);
      }
    } catch {
      /* order can still proceed — server also syncs */
    }
  };

  const placeCodOrder = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      await syncShippingToProfile();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({
          ...form,
          items,
          total_amount: grandTotal,
          payment_method: "cod",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) persistAccessToken(data.token);
        setEmailRequiredHint(false);
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

  const startOnlinePayment = async () => {
    if (!validateForm()) return;
    if (!safepayEnabled) {
      toast("Online payments are not available right now", "error");
      return;
    }

    try {
      setSubmitting(true);
      await syncShippingToProfile();
      const res = await fetch("/api/payments/safepay/session", {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({
          ...form,
          items,
          total_amount: grandTotal,
          payment_method: paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.session) {
        toast(data.message || "Could not start payment session", "error");
        return;
      }

      const session = data.session as SafepaySession;

      if (paymentMethod === "card") {
        setPaymentSession(session);
        toast("Enter your card details below to complete payment.");
      }

      // Raast & wallet redirect disabled until Safepay merchant auth is configured.
      // if ((paymentMethod === "raast" || paymentMethod === "wallet") && session.checkoutUrl) {
      //   window.location.href = session.checkoutUrl;
      //   return;
      // }
    } catch {
      toast("Could not start payment session", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === "cod") {
      await placeCodOrder();
    } else {
      await startOnlinePayment();
    }
  };

  const handlePaymentSuccess = () => {
    clear();
    toast("Payment submitted successfully!");
    router.push("/orders?placed=1");
  };

  const submitLabel =
    paymentMethod === "cod"
      ? submitting
        ? "Placing order..."
        : "Place order (COD)"
      : submitting
        ? "Preparing payment..."
        : paymentSession
          ? "Payment ready below"
          : "Continue to card payment";

  return (
    <Box sx={{ backgroundColor: "#f8fafc", minHeight: "70vh" }}>
      <PageBanner title="Checkout" subtitle="Choose how you want to pay and confirm your order" />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {items.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: "center", borderRadius: 4 }}>
            <Typography sx={{ mb: 2 }}>Your cart is empty.</Typography>
            <Button variant="contained" onClick={() => router.push("/shop")}>
              Continue shopping
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={4}>
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 4, borderRadius: 4, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: BRAND.navy }}>
                  Shipping details
                </Typography>
                <Grid container spacing={2} component="form" onSubmit={handleSubmit}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      name="customer_name"
                      label="Full name"
                      value={form.customer_name}
                      onChange={handleChange}
                      disabled={Boolean(paymentSession)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      type="email"
                      name="customer_email"
                      label="Email"
                      placeholder={emailRequiredHint ? "Enter your email" : undefined}
                      helperText={
                        emailRequiredHint
                          ? "Required for order updates — Facebook did not share an email"
                          : undefined
                      }
                      value={form.customer_email}
                      onChange={handleChange}
                      disabled={Boolean(paymentSession)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      name="phone"
                      label="Phone"
                      value={form.phone}
                      onChange={handleChange}
                      disabled={Boolean(paymentSession)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      name="city"
                      label="City"
                      value={form.city}
                      onChange={handleChange}
                      disabled={Boolean(paymentSession)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      name="address"
                      label="Address"
                      value={form.address}
                      onChange={handleChange}
                      disabled={Boolean(paymentSession)}
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper sx={{ p: 4, borderRadius: 4, mb: 3 }}>
                <PaymentMethodSelector
                  value={paymentMethod}
                  onChange={handlePaymentMethodChange}
                  disabled={Boolean(paymentSession)}
                />
              </Paper>

              {!paymentSession && (
                <Paper sx={{ p: 4, borderRadius: 4 }}>
                  {paymentMethod === "cod" && (
                    <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                      You will pay PKR {grandTotal.toLocaleString()} in cash when your order is delivered.
                    </Alert>
                  )}
                  {/* Raast & wallet disabled until Safepay merchant auth is configured.
                  {(paymentMethod === "raast" || paymentMethod === "wallet") && (
                    <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                      You will be redirected to Safepay to complete payment via{" "}
                      {paymentMethod === "raast" ? "Raast" : "mobile wallet"}.
                    </Alert>
                  )}
                  */}
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={submitting}
                    onClick={handleSubmit}
                    sx={{
                      fontWeight: 700,
                      backgroundColor: BRAND.gold,
                      color: BRAND.navy,
                      "&:hover": { backgroundColor: BRAND.goldHover },
                    }}
                  >
                    {submitLabel}
                  </Button>
                </Paper>
              )}

              {paymentSession && paymentMethod === "card" && (
                <Paper sx={{ p: 4, borderRadius: 4 }}>
                  <SafepayPaymentForm
                    tracker={paymentSession.tracker}
                    clientToken={paymentSession.clientToken}
                    environment={paymentSession.environment}
                    onSuccess={handlePaymentSuccess}
                    onError={(message) => toast(message, "error")}
                  />
                  <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                    Your order will be confirmed once Safepay verifies the payment via webhook.
                  </Alert>
                </Paper>
              )}
            </Grid>

            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 4, borderRadius: 4, position: "sticky", top: 90 }}>
                {promoActive && <FreeDeliveryPromoBanner savedAmount={settings.fee} compact />}
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
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
                <DeliveryShippingLine
                  shipping={shipping}
                  isPromo={promoActive}
                  standardFee={settings.fee}
                  label="Shipping"
                />
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography fontWeight={800}>Total</Typography>
                  <Typography fontWeight={800} color="primary">
                    PKR {grandTotal.toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                  Payment: {paymentMethod === "cod" ? "Cash on Delivery" : "Card"}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
}
