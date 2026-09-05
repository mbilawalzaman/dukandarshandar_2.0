"use client";

import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Divider,
  Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import Link from "next/link";
import PageBanner from "../components/PageBanner";
import { useCart } from "@/app/providers/CartProvider";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";
import FreeDeliveryPromoBanner from "../components/FreeDeliveryPromoBanner";
import DeliveryShippingLine from "../components/DeliveryShippingLine";

export default function CartPage() {
  const { items, updateQuantity, remove } = useCart();
  const { settings, getShipping, isPromoActive } = useDeliverySettings();
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = getShipping(subtotal);
  const promoActive = isPromoActive(subtotal);
  const grandTotal = subtotal + shipping;

  return (
    <Box sx={{ minHeight: "70vh", backgroundColor: "#f8fafc" }}>
      <PageBanner title="Shopping Cart" subtitle="Review your selected products and proceed to checkout" />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {items.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: "center", borderRadius: 4 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              Your cart is currently empty.
            </Typography>
            <Button component={Link} href="/shop" variant="contained">
              Explore Products
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {items.map((item) => (
                  <Card key={item._id} sx={{ borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                    <CardContent
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: { xs: 2, sm: 3 },
                        flexWrap: { xs: "wrap", sm: "nowrap" },
                        p: 2.5,
                        "&:last-child": { pb: 2.5 },
                      }}
                    >
                      {/* Item Details (Image + Name & Price) */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, flex: 1, minWidth: 0 }}>
                        <Box
                          component="img"
                          src={item.image || "/images/logo.jpg"}
                          alt={item.name}
                          sx={{ width: 80, height: 80, borderRadius: 2, objectFit: "cover", flexShrink: 0 }}
                        />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                            {item.name}
                          </Typography>
                          <Typography variant="body2" color="primary" sx={{ fontWeight: 600, mt: 0.5 }}>
                            PKR {item.price.toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Item Actions (Quantity, Total Price, Delete Icon) */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: { xs: "space-between", sm: "flex-end" },
                          gap: { xs: 2, sm: 2.5 },
                          width: { xs: "100%", sm: "auto" },
                          flexShrink: 0,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 2 }}>
                          <IconButton size="small" onClick={() => updateQuantity(item._id, item.quantity - 1)}>
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ px: 2, fontWeight: 700 }}>{item.quantity}</Typography>
                          <IconButton size="small" onClick={() => updateQuantity(item._id, item.quantity + 1)}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, minWidth: { xs: "auto", sm: 90 }, textAlign: "right" }}>
                          PKR {(item.price * item.quantity).toLocaleString()}
                        </Typography>
                        <IconButton color="error" onClick={() => remove(item._id)} sx={{ p: 1 }}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 4, borderRadius: 4 }}>
                {promoActive && <FreeDeliveryPromoBanner savedAmount={settings.fee} compact />}
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Order Summary
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                  <Typography color="text.secondary">Subtotal</Typography>
                  <Typography sx={{ fontWeight: 600 }}>PKR {subtotal.toLocaleString()}</Typography>
                </Box>
                <DeliveryShippingLine
                  shipping={shipping}
                  isPromo={promoActive}
                  standardFee={settings.fee}
                />
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
                  <Typography variant="h6">Total Amount</Typography>
                  <Typography variant="h6" color="primary">
                    PKR {grandTotal.toLocaleString()}
                  </Typography>
                </Box>
                <Button component={Link} href="/checkout" variant="contained" fullWidth size="large" sx={{ py: 1.5 }}>
                  Proceed to Checkout
                </Button>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
}
