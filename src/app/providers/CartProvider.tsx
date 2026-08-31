"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import {
  addToCart as addItem,
  cartCount,
  clearCart,
  getCart,
  removeFromCart,
  saveCart,
  updateCartQuantity,
  type CartItem,
} from "@/lib/cart";

type CartContextValue = {
  items: CartItem[];
  count: number;
  add: (product: { _id: string; name: string; price: number; image?: string }, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  toast: (message: string, severity?: "success" | "error" | "info") => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [toastState, setToastState] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });

  const refresh = useCallback(() => {
    setItems(getCart());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("cartChange", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cartChange", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const toast = useCallback((message: string, severity: "success" | "error" | "info" = "success") => {
    setToastState({ open: true, message, severity });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: cartCount(items),
      add: (product, quantity = 1) => {
        addItem(product, quantity);
        refresh();
        toast(`${product.name} added to cart`);
      },
      updateQuantity: (id, quantity) => {
        updateCartQuantity(id, quantity);
        refresh();
      },
      remove: (id) => {
        removeFromCart(id);
        refresh();
      },
      clear: () => {
        clearCart();
        refresh();
      },
      toast,
    }),
    [items, refresh, toast]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <Snackbar
        open={toastState.open}
        autoHideDuration={2800}
        onClose={() => setToastState((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToastState((s) => ({ ...s, open: false }))}
          severity={toastState.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toastState.message}
        </Alert>
      </Snackbar>
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}

export function useCartOptional() {
  return useContext(CartContext);
}

export { saveCart };
