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
  CircularProgress,
} from "@mui/material";
import { jwtDecode } from "jwt-decode";
import PageBanner from "../components/PageBanner";
import SafepayPaymentForm from "../components/checkout/SafepayPaymentForm";
import PaymentMethodSelector from "../components/checkout/PaymentMethodSelector";
import PakistanLocationFields from "../components/checkout/PakistanLocationFields";
import { useCart } from "@/app/providers/CartProvider";
import { authHeaders } from "@/lib/cart";
import { BRAND } from "@/lib/constants";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";
import FreeDeliveryPromoBanner from "../components/FreeDeliveryPromoBanner";
import DeliveryShippingLine from "../components/DeliveryShippingLine";
import { authFetch, persistAccessToken } from "@/lib/authFetch";
import { isSyntheticEmail, isValidCustomerEmail } from "@/lib/userDisplay";
import {
  getGuestCheckoutInfo,
  saveGuestCheckoutInfo,
  isGuestUser,
} from "@/lib/guestCheckout";
import type { CheckoutShippingFormType } from "@/types/apps/orderTypes";
import { fetchAreas } from "@/lib/locationClient";
import type { CheckoutSafepaySessionType, PaymentMethod } from "@/types/apps/paymentTypes";
import type { UserTokenType } from "@/types/shared/authTypes";

type TokenUser = UserTokenType;

type SafepaySession = CheckoutSafepaySessionType;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear, toast } = useCart();
  const { settings, getShipping, isPromoActive } = useDeliverySettings();
  const [submitting, setSubmitting] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [paymentSession, setPaymentSession] = useState<SafepaySession | null>(null);
  const [emailRequiredHint, setEmailRequiredHint] = useState(false);
  const [form, setForm] = useState<CheckoutShippingFormType>({
    customer_name: "",
    customer_email: "",
    phone: "",
    province: "",
    city: "",
    area: "",
    address: "",
  });

  const safepayEnabled =
    process.env.NEXT_PUBLIC_SAFEPAY_ENV === "sandbox" || process.env.NEXT_PUBLIC_SAFEPAY_ENV === "production";

  useEffect(() => {
    const redirectToLogin = (severity: "info" | "error" = "info") => {
      toast("Please login, sign up, or continue as guest to place an order.", severity);
      router.push("/login?next=/checkout");
    };

    void (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          redirectToLogin();
          return;
        }

        let decoded: TokenUser;
        try {
          decoded = jwtDecode(token);
        } catch {
          localStorage.removeItem("token");
          redirectToLogin("error");
          return;
        }

        if (!decoded.userId && decoded.role !== "guest") {
          localStorage.removeItem("token");
          redirectToLogin("error");
          return;
        }

        const isGuest = isGuestUser(decoded);

        if (isGuest) {
          // Mount flow for guest:
          // Do NOT set name/email from JWT placeholder token
          // Load guestCheckoutInfo → prefill if present
          const guestInfo = getGuestCheckoutInfo();
          setForm({
            customer_name: guestInfo.customer_name,
            customer_email: guestInfo.customer_email,
            phone: guestInfo.phone,
            province: guestInfo.province || "",
            city: guestInfo.city || "",
            area: guestInfo.area || "",
            address: guestInfo.address || "",
          });
          setEmailRequiredHint(true);
          setCheckingAuth(false);
          return;
        }

        const tokenEmail = decoded.email || "";
        const needsRealEmail = isSyntheticEmail(tokenEmail);

        setForm((prev) => ({
          ...prev,
          customer_name: decoded.userName || prev.customer_name,
          customer_email: needsRealEmail ? "" : tokenEmail || prev.customer_email,
        }));
        setEmailRequiredHint(needsRealEmail);
        setCheckingAuth(false);

        const res = await authFetch("/api/profile");
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success || !data.profile) return;

        const p = data.profile as {
          name?: string;
          email?: string;
          phone?: string;
          province?: string;
          city?: string;
          area?: string;
          address?: string;
          needsEmail?: boolean;
          image?: string;
        };
        setEmailRequiredHint(Boolean(p.needsEmail) || needsRealEmail);
        setForm((prev) => ({
          customer_name: p.name || prev.customer_name,
          customer_email: p.email || (needsRealEmail ? "" : prev.customer_email),
          phone: p.phone || prev.phone,
          province: p.province || prev.province,
          city: p.city || prev.city,
          area: p.area || prev.area,
          address: p.address || prev.address,
        }));
        if (p.image) localStorage.setItem("userImage", p.image);
      } catch {
        redirectToLogin("error");
      }
    })();
  }, [router, toast]);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = getShipping(subtotal);
  const promoActive = isPromoActive(subtotal);
  const grandTotal = subtotal + shipping;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      persistGuestDraft(next);
      return next;
    });
  };

  const handleLocationFieldsChange = (updatedFields: Partial<CheckoutShippingFormType>) => {
    setForm((prev) => {
      const next = { ...prev, ...updatedFields };
      persistGuestDraft(next);
      return next;
    });
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setPaymentSession(null);
  };

  const persistGuestDraft = (info: CheckoutShippingFormType) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const decoded: TokenUser = jwtDecode(token);
      if (isGuestUser(decoded)) {
        saveGuestCheckoutInfo(info);
      }
    } catch {
      /* ignore */
    }
  };

  const persistGuestInfoIfApplicable = () => {
    persistGuestDraft(form);
  };

  const validateForm = async (): Promise<boolean> => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast("Please login, sign up, or continue as guest to place your order.", "error");
      router.push("/login?next=/checkout");
      return false;
    }
    try {
      jwtDecode(token);
    } catch {
      localStorage.removeItem("token");
      toast("Please login, sign up, or continue as guest to place your order.", "error");
      router.push("/login?next=/checkout");
      return false;
    }

    if (!form.customer_name || /^guest(\s*user)?$/i.test(form.customer_name.trim())) {
      toast("Please enter your full name", "error");
      return false;
    }
    if (!form.customer_email || !isValidCustomerEmail(form.customer_email)) {
      toast("Please enter a valid email address for order updates", "error");
      return false;
    }
    if (!form.phone || !form.province || !form.city || !form.address) {
      toast("Please fill in all required shipping fields (Phone, Province, City, Address)", "error");
      return false;
    }
    const areaCheck = await fetchAreas(form.city, form.province);
    if (areaCheck.hasCuratedAreas && !(form.area || "").trim()) {
      toast("Please select an area / neighborhood", "error");
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
      if (isGuestUser(decoded)) return;

      const res = await authFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: form.customer_name.trim(),
          email: form.customer_email.trim().toLowerCase(),
          phone: form.phone.trim(),
          province: (form.province || "").trim(),
          city: form.city.trim(),
          area: (form.area || "").trim(),
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
    if (!(await validateForm())) return;

    try {
      setSubmitting(true);
      await syncShippingToProfile();
      persistGuestInfoIfApplicable();

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
      if (res.status === 401) {
        toast(data.message || "Please login to place an order", "error");
        router.push("/login?next=/checkout");
        return;
      }
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
    if (!(await validateForm())) return;
    if (!safepayEnabled) {
      toast("Online payments are not available right now", "error");
      return;
    }

    try {
      setSubmitting(true);
      await syncShippingToProfile();
      persistGuestInfoIfApplicable();

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
      if (res.status === 401) {
        toast(data.message || "Please login to place an order", "error");
        router.push("/login?next=/checkout");
        return;
      }
      if (!res.ok || !data.success || !data.session) {
        toast(data.message || "Could not start payment session", "error");
        return;
      }

      const session = data.session as SafepaySession;

      if (paymentMethod === "card") {
        setPaymentSession(session);
        toast("Enter your card details below to complete payment.");
      }
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
    persistGuestInfoIfApplicable();
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

  if (checkingAuth) {
    return (
      <Box sx={{ minHeight: "70vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

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
                  <Grid item xs={12} sm={12}>
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
                  <Grid item xs={12}>
                    <PakistanLocationFields
                      values={{
                        province: form.province,
                        city: form.city,
                        area: form.area,
                        address: form.address,
                      }}
                      onChange={handleLocationFieldsChange}
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
