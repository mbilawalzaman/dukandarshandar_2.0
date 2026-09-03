import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { isSafepayWebhookConfigured } from "@/lib/safepayConfig";
import { SafepayWebhookService } from "@/services/safepayWebhookService";
import { SafepayService } from "@/services/safepayService";
import type { SafepayWebhookPayload } from "@/types/apps/paymentTypes";

/**
 * HTTP controller for Safepay webhook endpoints.
 * Handles request parsing/response only logic lives in SafepayWebhookService.
 */
export class SafepayWebhookController {
  static async handleWebhook(req: NextRequest): Promise<NextResponse> {
    try {
      if (!isSafepayWebhookConfigured()) {
        return NextResponse.json({ success: false, message: "Safepay webhook secret is not configured" }, { status: 503 });
      }

      const rawBody = await req.text();

      if (!rawBody) {
        return NextResponse.json({ success: false, message: "Empty webhook payload" }, { status: 400 });
      }

      const signature = req.headers.get("x-sfpy-signature");
      const timestamp = req.headers.get("x-sfpy-timestamp");
      const eventId = req.headers.get("x-sfpy-event-id");
      const eventType = req.headers.get("x-sfpy-event-type");

      const verification = SafepayService.verifyWebhookSignatureDetailed(rawBody, signature, timestamp);
      if (!verification.valid) {
        return NextResponse.json({ success: false, message: "Invalid webhook signature" }, { status: 401 });
      }

      let payload: SafepayWebhookPayload;
      try {
        payload = JSON.parse(rawBody) as SafepayWebhookPayload;
      } catch {
        return NextResponse.json({ success: false, message: "Invalid JSON payload" }, { status: 400 });
      }

      const result = await SafepayWebhookService.handleVerifiedEvent(payload, {
        signature,
        timestamp,
        eventId,
        eventType,
      });

      const status = result.handled ? 200 : 404;

      return NextResponse.json(
        {
          success: result.handled,
          handled: result.handled,
          message: result.message,
        },
        { status }
      );
    } catch (error) {
      console.error("[SafepayWebhookController] Webhook error:", error);
      return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
  }
}
