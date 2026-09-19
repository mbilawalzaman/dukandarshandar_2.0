export class CheckoutError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.name = "CheckoutError"; this.status = status; }
}

export type CheckoutItem = { _id: string; quantity: number; name: string; price: number };
export const MAX_CHECKOUT_QUANTITY = 10000;

export function normalizeCartItems(value: unknown): CheckoutItem[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) throw new CheckoutError("Cart must contain between 1 and 100 products");
  const seen = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item._id !== "string" || !/^[a-f\d]{24}$/i.test(item._id)) throw new CheckoutError("Invalid product in cart");
    const id = item._id.toLowerCase();
    if (seen.has(id)) throw new CheckoutError("Duplicate product in cart");
    seen.add(id);
    if (typeof item.quantity !== "number" || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_CHECKOUT_QUANTITY) {
      throw new CheckoutError("Product quantities must be positive whole numbers");
    }
    // Descriptions and prices will be loaded from the catalog; never trust client values.
    return { _id: id, quantity: item.quantity, name: "Product", price: 0 };
  });
}

export function validateCheckout(value: unknown, allowedMethods: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CheckoutError("Invalid checkout request");
  const body = value as Record<string, unknown>;
  const field = (key: string, max: number, required = true) => {
    const v = body[key];
    if (!required && v === undefined) return "";
    if (typeof v !== "string" || v.trim().length > max || (required && !v.trim())) throw new CheckoutError(`Invalid ${key.replaceAll("_", " ")}`);
    return v.trim();
  };
  const customer_email = field("customer_email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) throw new CheckoutError("Enter a valid email address");
  const phone = field("phone", 30);
  if (!/^\+?[\d\s()-]+$/.test(phone) || phone.replace(/\D/g, "").length < 10 || phone.replace(/\D/g, "").length > 15) throw new CheckoutError("Enter a valid phone number");
  const payment_method = body.payment_method ?? allowedMethods[0];
  if (typeof payment_method !== "string" || !allowedMethods.includes(payment_method)) throw new CheckoutError("Invalid payment method");
  return {
    customer_name: field("customer_name", 120), customer_email, phone,
    province: field("province", 100), city: field("city", 150), area: field("area", 150, false), address: field("address", 500),
    items: normalizeCartItems(body.items), payment_method, promo_code: field("promo_code", 30, false).toUpperCase(),
  };
}

export const ACTIVE_PRODUCT_FILTER = { status: "active", deleted_at: null };
export function isAvailableProduct(product: { _id?: unknown; status?: unknown; deleted_at?: unknown; price?: unknown } | null | undefined): boolean {
  return Boolean(product && product.status === "active" && !product.deleted_at && typeof product.price === "number" && Number.isFinite(product.price) && product.price > 0);
}
