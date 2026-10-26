import { cartLineKey } from "@/lib/productVariations";

export type CartItem = {
  _id: string;
  variationId?: string;
  variationName?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category?: string;
};

const CART_KEY = "cart";
const BUY_NOW_KEY = "buy_now_checkout_item";

export function setBuyNowCheckoutItem(product: AddToCartProduct, quantity = 1) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    BUY_NOW_KEY,
    JSON.stringify({
      _id: product._id,
      variationId: product.variationId,
      variationName: product.variationName,
      name: product.name,
      price: Number(product.price) || 0,
      quantity,
      image: product.image || "",
      category: product.category,
    } satisfies CartItem),
  );
}

export function getBuyNowCheckoutItem(): CartItem | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(BUY_NOW_KEY);

    if (!raw) return null;

    const item = JSON.parse(raw) as Partial<CartItem>;
    const quantity = Number(item.quantity);

    if (!item._id || !Number.isFinite(quantity) || quantity < 1) return null;

    return {
      _id: String(item._id),
      variationId: item.variationId,
      variationName: item.variationName,
      name: String(item.name || ""),
      price: Number(item.price) || 0,
      quantity,
      image: String(item.image || ""),
      category: item.category ? String(item.category) : undefined,
    };
  } catch {
    return null;
  }
}

export function getCheckoutReturnPath() {
  if (typeof window === "undefined") return "/checkout";

  return new URLSearchParams(window.location.search).get("buyNow") === "1"
    ? "/checkout?buyNow=1"
    : "/checkout";
}

export function clearBuyNowCheckoutItem() {
  if (typeof window !== "undefined") sessionStorage.removeItem(BUY_NOW_KEY);
}

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
        variationId: item.variationId,
        variationName: item.variationName,
        name: String(item.name || ""),
        price: Number(item.price) || 0,
        quantity: Number(item.quantity ?? item.selectedQuantity) || 1,
        image: String(item.image || ""),
        category: item.category ? String(item.category) : undefined,
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

export type AddToCartProduct = {
  _id: string;
  variationId?: string;
  variationName?: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
};

export function addToCart(
  product: AddToCartProduct,
  quantity = 1,
  availableQuantity = Number.POSITIVE_INFINITY,
): { items: CartItem[]; addedQuantity: number } {
  const cart = getCart();

  const existing = cart.find(
    (item) => cartLineKey(item) === cartLineKey(product),
  );

  const currentQuantity = existing?.quantity ?? 0;
  const requestedQuantity = Math.max(0, Math.floor(Number(quantity) || 0));

  const stockLimit = Number.isFinite(availableQuantity)
    ? Math.max(0, Math.floor(availableQuantity))
    : Number.POSITIVE_INFINITY;

  const addedQuantity = Math.min(
    requestedQuantity,
    Math.max(0, stockLimit - currentQuantity),
  );

  if (addedQuantity === 0) return { items: cart, addedQuantity };

  if (existing) {
    existing.quantity += addedQuantity;
    // Older carts were saved without a category; backfill so promotions can scope by it.
    if (!existing.category && product.category)
      existing.category = product.category;
  } else {
    cart.push({
      _id: product._id,
      variationId: product.variationId,
      variationName: product.variationName,
      name: product.name,
      price: Number(product.price) || 0,
      quantity: addedQuantity,
      image: product.image || "",
      category: product.category || undefined,
    });
  }

  saveCart(cart);

  return { items: cart, addedQuantity };
}

export function updateCartQuantity(id: string, quantity: number): CartItem[] {
  const cart = getCart()
    .map((item) => (cartLineKey(item) === id ? { ...item, quantity } : item))
    .filter((item) => item.quantity > 0);

  saveCart(cart);

  return cart;
}

export function removeFromCart(id: string): CartItem[] {
  const cart = getCart().filter((item) => cartLineKey(item) !== id);

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
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
