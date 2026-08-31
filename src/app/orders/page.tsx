"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import PageBanner from "../components/PageBanner";
import { authHeaders } from "@/lib/cart";

interface Order {
  _id: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at?: string;
  items: { name: string; quantity: number; price: number }[];
}

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const params = useSearchParams();
  const router = useRouter();
  const placed = params.get("placed");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push("/login?next=/orders");
      return;
    }

    const load = async () => {
      try {
        const res = await fetch("/api/orders", { headers: authHeaders() });
        const data = await res.json();
        if (data.success) setOrders(data.orders || []);
        else setError(data.message || "Could not load orders");
      } catch {
        setError("Could not load orders");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  return (
    <Box>
      <PageBanner title="My Orders" subtitle="Track your Dukandar Shandar purchases" />
      <Container maxWidth="md" sx={{ py: 6 }}>
        {placed && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Order placed successfully. Thank you for shopping with Dukandar Shandar.
          </Alert>
        )}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : orders.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: "center" }}>
            <Typography sx={{ mb: 2 }}>You have no orders yet.</Typography>
            <Button variant="contained" onClick={() => router.push("/shop")}>
              Start shopping
            </Button>
          </Paper>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {orders.map((order) => (
              <Paper key={order._id} sx={{ p: 3, borderRadius: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
                  <Typography fontWeight={700}>Order #{String(order._id).slice(-8).toUpperCase()}</Typography>
                  <Chip label={order.status} color={order.status === "delivered" ? "success" : "warning"} size="small" />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {order.created_at ? new Date(order.created_at).toLocaleString() : ""}
                </Typography>
                {order.items?.map((item, i) => (
                  <Typography key={i} variant="body2">
                    {item.name} × {item.quantity}
                  </Typography>
                ))}
                <Typography sx={{ mt: 1, fontWeight: 700 }}>PKR {Number(order.total_amount).toLocaleString()}</Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}>
      <OrdersContent />
    </Suspense>
  );
}
