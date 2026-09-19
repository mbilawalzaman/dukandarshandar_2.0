export type OrderState = { _id?: unknown; status?: string; payment_status?: string; payment_method?: string; stock_reserved?: boolean; customer_id?: unknown };

export function ownsOrder(order: OrderState, user: { userId?: string; role?: string }): boolean {
  return user.role === "admin" || Boolean(user.userId && order.customer_id && String(order.customer_id) === user.userId);
}

/** Legacy orders reserved stock only at COD placement or successful online payment. */
export function hasReservedStock(order: OrderState): boolean {
  if (typeof order.stock_reserved === "boolean") return order.stock_reserved;
  return ["pending", "processing", "shipped", "delivered"].includes(order.status || "") &&
    ((order.payment_method || "cod") === "cod" || order.payment_status === "paid");
}

export function allowedOrderTransitions(order: OrderState): string[] {
  if (["cancelled", "delivered", "cancelling"].includes(order.status || "")) return [];
  if (["pending_payment", "payment_failed", "payment_review"].includes(order.status || "")) return ["cancelled"];
  if (order.payment_method !== "cod" && order.payment_status !== "paid" && order.payment_method) return ["cancelled"];
  switch (order.status) {
    case "pending": return ["processing", "shipped", "cancelled"];
    case "processing": return ["shipped", "cancelled"];
    case "shipped": return ["delivered"];
    default: return [];
  }
}
