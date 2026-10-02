export type OrderState = { _id?: unknown; status?: string; payment_status?: string; payment_method?: string; stock_reserved?: boolean; customer_id?: unknown };

export function ownsOrder(order: OrderState, user: { userId?: string; role?: string }): boolean {
  return user.role === "admin" || Boolean(user.userId && order.customer_id && String(order.customer_id) === user.userId);
}

/** Legacy orders reserved stock only at COD placement or successful online payment. */
export function hasReservedStock(order: OrderState): boolean {
  if (typeof order.stock_reserved === "boolean") return order.stock_reserved;
  const statusKey = (order.status || "").toLowerCase().replace(/\s+/g, "_");
  return ["pending", "processing", "ready_to_ship", "shipped", "delivered"].includes(statusKey) &&
    ((order.payment_method || "cod") === "cod" || order.payment_status === "paid");
}

export function allowedOrderTransitions(order: OrderState): string[] {
  const normStatus = (order.status || "").toLowerCase().replace(/\s+/g, "_");

  if (["cancelled", "delivered", "cancelling"].includes(normStatus)) return [];
  if (["pending_payment", "payment_failed", "payment_review"].includes(normStatus)) return ["cancelled"];
  if (order.payment_method !== "cod" && order.payment_status !== "paid" && order.payment_method) return ["cancelled"];

  switch (normStatus) {
    case "pending":
      return ["processing", "ready_to_ship", "shipped", "cancelled"];
    case "processing":
      return ["ready_to_ship", "shipped", "cancelled"];
    case "ready_to_ship":
      return ["shipped", "cancelled"];
    case "shipped":
      return ["delivered"];
    default:
      return [];
  }
}
