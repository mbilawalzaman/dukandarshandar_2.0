import { OrderPaymentService } from "./orderPaymentService";
import { SafepayService } from "./safepayService";
import {
  isSafepayFailureEvent,
  isSafepaySuccessEvent,
  resolveSafepayEventType,
  resolveSafepayOrderId,
  resolveSafepayTracker,
} from "@/lib/safepayWebhookPayload";
import type { SafepayWebhookHeaders, SafepayWebhookPayload } from "@/types/safepay";

/**
 * Safepay webhook business logic parse events and update order payment state.
 */
export class SafepayWebhookService {
  static async handleVerifiedEvent(
    payload: SafepayWebhookPayload,
    headers: SafepayWebhookHeaders
  ): Promise<{ handled: boolean; message: string }> {
    const eventType = resolveSafepayEventType(payload, headers);
    const tracker = resolveSafepayTracker(payload);
    const orderIdHint = resolveSafepayOrderId(payload);
    const orderId = await OrderPaymentService.resolveOrderIdForWebhook(tracker, orderIdHint);

    if (!orderId) {
      return { handled: false, message: "Order not found for webhook" };
    }

    if (isSafepaySuccessEvent(eventType, payload)) {
      const result = await OrderPaymentService.fulfillPaidOrder(orderId, tracker || undefined);
      if (result.notFound) {
        return { handled: false, message: "Order not found for webhook" };
      }
      return {
        handled: true,
        message: result.alreadyPaid ? "Order already marked as paid" : "Order fulfilled after payment",
      };
    }

    if (isSafepayFailureEvent(eventType, payload)) {
      const result = await OrderPaymentService.markPaymentFailed(orderId, tracker || undefined);
      if (result.notFound) {
        return { handled: false, message: "Order not found for webhook" };
      }
      return { handled: true, message: "Order marked as payment failed" };
    }

    return { handled: true, message: `Acknowledged unhandled event: ${eventType || "unknown"}` };
  }

  static verifySignature(rawBody: string, signature: string | null, timestamp: string | null): boolean {
    return SafepayService.verifyWebhookSignature(rawBody, signature, timestamp);
  }
}
