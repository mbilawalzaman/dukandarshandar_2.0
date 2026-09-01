import Safepay from "@sfpy/node-core";
import {
  getSafepayApiBaseUrl,
  getSafepayApiKey,
  getSafepayEnvironment,
  getSafepaySecretKey,
  toSafepayAmount,
} from "@/lib/safepayConfig";
import { verifySafepayWebhookSignature } from "@/lib/safepayWebhookSignature";
import type {
  SafepayCustomerCreateResponse,
  SafepayPassportTokenResponse,
  SafepaySessionParams,
  SafepaySessionResult,
  SafepaySessionSetupResponse,
} from "@/types/safepay";

function createClient() {
  return new Safepay(getSafepaySecretKey(), {
    authType: "secret",
    host: getSafepayApiBaseUrl(),
  });
}

function extractTracker(response: SafepaySessionSetupResponse): string {
  const trackerToken = response.data?.tracker?.token;
  if (!trackerToken) throw new Error("Safepay session response missing tracker");
  return trackerToken;
}

function extractClientToken(response: SafepayPassportTokenResponse): string {
  const data = response.data;
  if (typeof data === "string" && data) return data;
  if (data && typeof data === "object") {
    if (typeof data.token === "string") return data.token;
    if (typeof data.access_token === "string") return data.access_token;
  }
  throw new Error("Safepay client token response missing token");
}

function splitCustomerName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "Customer", lastName: "Guest" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "Customer" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/**
 * Safepay API integration — external API calls and signature verification only.
 */
export class SafepayService {
  static async createGuestCustomer(params: {
    email: string;
    name: string;
    phone?: string;
  }): Promise<string> {
    const client = createClient();
    const { firstName, lastName } = splitCustomerName(params.name);

    const response = (await client.customers.object.create({
      first_name: firstName,
      last_name: lastName,
      email: params.email,
      phone_number: params.phone || "",
      country: "PK",
      is_guest: true,
    })) as SafepayCustomerCreateResponse;

    const token = response?.data?.token;
    if (typeof token !== "string" || !token) {
      throw new Error("Safepay customer creation failed");
    }
    return token;
  }

  static async createPaymentSession(params: SafepaySessionParams): Promise<{ tracker: string }> {
    const client = createClient();
    const customerToken = await SafepayService.createGuestCustomer({
      email: params.customerEmail,
      name: params.customerName,
      phone: params.customerPhone,
    });

    const response = (await client.payments.session.setup({
      merchant_api_key: getSafepayApiKey(),
      user: customerToken,
      intent: "CYBERSOURCE",
      mode: "payment",
      entry_mode: "raw",
      currency: params.currency || "PKR",
      amount: toSafepayAmount(params.amount),
      metadata: {
        order_id: params.orderId,
      },
    })) as SafepaySessionSetupResponse;

    return { tracker: extractTracker(response) };
  }

  static async createClientToken(): Promise<string> {
    const client = createClient();
    const response = (await client.client.passport.create()) as SafepayPassportTokenResponse;
    return extractClientToken(response);
  }

  static createHostedCheckoutUrl(params: {
    tracker: string;
    clientToken: string;
    orderId: string;
    redirectUrl: string;
    cancelUrl: string;
  }): string {
    const client = createClient();
    const env = getSafepayEnvironment();

    return client.checkout.createCheckoutUrl({
      env,
      tracker: params.tracker,
      tbt: params.clientToken,
      source: "hosted",
      order_id: params.orderId,
      redirect_url: params.redirectUrl,
      cancel_url: params.cancelUrl,
    });
  }

  static async createCheckoutSession(
    params: SafepaySessionParams,
    options?: { hostedRedirectUrl?: string; hostedCancelUrl?: string }
  ): Promise<SafepaySessionResult> {
    const [{ tracker }, clientToken] = await Promise.all([
      SafepayService.createPaymentSession(params),
      SafepayService.createClientToken(),
    ]);

    const result: SafepaySessionResult = {
      tracker,
      clientToken,
      orderId: params.orderId,
      environment: getSafepayEnvironment(),
    };

    if (options?.hostedRedirectUrl && options?.hostedCancelUrl) {
      result.checkoutUrl = SafepayService.createHostedCheckoutUrl({
        tracker,
        clientToken,
        orderId: params.orderId,
        redirectUrl: options.hostedRedirectUrl,
        cancelUrl: options.hostedCancelUrl,
      });
    }

    return result;
  }

  static verifyWebhookSignature(rawBody: string, signature: string | null, timestamp: string | null): boolean {
    return verifySafepayWebhookSignature(rawBody, signature, timestamp).valid;
  }

  static verifyWebhookSignatureDetailed(
    rawBody: string,
    signature: string | null,
    timestamp: string | null
  ) {
    return verifySafepayWebhookSignature(rawBody, signature, timestamp);
  }
}
