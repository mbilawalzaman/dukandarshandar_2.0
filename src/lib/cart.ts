export type CartItem = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

const CART_KEY = "cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: Partial<CartItem> & { selectedQuantity?: number }) => ({
        _id: String(item._id || ""),
        name: String(item.name || ""),
        price: Number(item.price) || 0,
        quantity: Number(item.quantity ?? item.selectedQuantity) || 1,
        image: String(item.image || "/images/logo.jpg"),
      }))
      .filter((item: CartItem) => item._id);
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cartChange"));
}

export function addToCart(
  product: { _id: string; name: string; price: number; image?: string },
  quantity = 1
): CartItem[] {
  const cart = getCart();
  const existing = cart.find((item) => item._id === product._id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      _id: product._id,
      name: product.name,
      price: Number(product.price) || 0,
      quantity,
      image: product.image || "/images/logo.jpg",
    });
  }
  saveCart(cart);
  return cart;
}

export function updateCartQuantity(id: string, quantity: number): CartItem[] {
  const cart = getCart()
    .map((item) => (item._id === id ? { ...item, quantity } : item))
    .filter((item) => item.quantity > 0);
  saveCart(cart);
  return cart;
}

export function removeFromCart(id: string): CartItem[] {
  const cart = getCart().filter((item) => item._id !== id);
  saveCart(cart);
  return cart;
}

export function clearCart() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event("cartChange"));
}

export function cartCount(items?: CartItem[]) {
  return (items ?? getCart()).reduce((sum, item) => sum + item.quantity, 0);
}

export function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
