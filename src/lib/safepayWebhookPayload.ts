import type { SafepayWebhookHeaders, SafepayWebhookPayload } from "@/types/apps/paymentTypes";

function normalizeEventToken(value: string): string {
  return value.toLowerCase().replace(/:/g, ".");
}

function resolveLegacyPaymentState(payload: SafepayWebhookPayload): string {
  return (payload.notification?.state || "").toUpperCase();
}

export function resolveSafepayEventType(payload: SafepayWebhookPayload, headers: SafepayWebhookHeaders): string {
  const headerType = headers.eventType ? normalizeEventToken(headers.eventType) : "";
  const payloadType = payload.type ? normalizeEventToken(payload.type) : "";
  const payloadEvent = payload.event ? normalizeEventToken(payload.event) : "";

  return headerType || payloadType || payloadEvent || (payload.data?.status || payload.status || "").toLowerCase();
}

export function resolveSafepayOrderId(payload: SafepayWebhookPayload): string | null {
  return (
    payload.metadata?.order_id ||
    payload.data?.metadata?.order_id ||
    payload.notification?.metadata?.order_id ||
    payload.data?.order_id ||
    payload.notification?.order_id ||
    payload.order_id ||
    null
  );
}

export function resolveSafepayTracker(payload: SafepayWebhookPayload): string | null {
  return (
    payload.tracker ||
    payload.notification?.tracker ||
    payload.data?.tracker ||
    payload.data?.token ||
    null
  );
}

export function isSafepaySuccessEvent(eventType: string, payload: SafepayWebhookPayload): boolean {
  const legacyState = resolveLegacyPaymentState(payload);

  if (legacyState === "PAID" || legacyState === "COMPLETED" || legacyState === "SUCCEEDED") {
    return true;
  }

  return (
    eventType.includes("payment.completed") ||
    eventType.includes("payment.succeeded") ||
    eventType.includes("payment.success") ||
    eventType.includes("payment.paid") ||
    eventType === "completed" ||
    eventType === "succeeded" ||
    eventType === "paid"
  );
}

export function isSafepayFailureEvent(eventType: string, payload: SafepayWebhookPayload): boolean {
  const legacyState = resolveLegacyPaymentState(payload);

  if (legacyState === "FAILED" || legacyState === "CANCELLED" || legacyState === "CANCELED" || legacyState === "REJECTED") {
    return true;
  }

  return (
    eventType.includes("payment.failed") ||
    eventType.includes("payment.cancelled") ||
    eventType.includes("payment.canceled") ||
    eventType.includes("payment.rejected") ||
    eventType === "failed" ||
    eventType === "cancelled" ||
    eventType === "canceled"
  );
}
