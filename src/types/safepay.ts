export type SafepayEnvironment = "sandbox" | "production";

export interface SafepaySessionParams {
  amount: number;
  currency?: string;
  orderId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
}

export interface SafepaySessionResult {
  tracker: string;
  clientToken: string;
  orderId: string;
  environment: SafepayEnvironment;
  checkoutUrl?: string;
}

export interface SafepayTrackerObject {
  token: string;
}

export interface SafepaySessionSetupData {
  tracker: SafepayTrackerObject;
}

export interface SafepaySessionSetupResponse {
  data?: SafepaySessionSetupData;
}

export interface SafepayPassportTokenData {
  token?: string;
  access_token?: string;
}

export interface SafepayPassportTokenResponse {
  data?: string | SafepayPassportTokenData;
}

export interface SafepayCustomerCreateResponse {
  data?: {
    token?: string;
  };
}

export interface SafepayWebhookHeaders {
  signature: string | null;
  timestamp: string | null;
  eventId: string | null;
  eventType: string | null;
}

export interface SafepayWebhookPayload {
  type?: string;
  event?: string;
  data?: {
    tracker?: string;
    token?: string;
    status?: string;
    metadata?: {
      order_id?: string;
    };
    order_id?: string;
  };
  /** Legacy Safepay webhook (Cybersource / Payments 1.0) */
  notification?: {
    tracker?: string;
    state?: string;
    metadata?: {
      order_id?: string;
    };
    order_id?: string;
  };
  tracker?: string;
  metadata?: {
    order_id?: string;
  };
  order_id?: string;
  status?: string;
}

export interface CreatePaymentSessionBody {
  customer_name: string;
  customer_email: string;
  phone: string;
  address: string;
  city: string;
  payment_method?: "card" | "raast" | "wallet";
  items: Array<{
    _id: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  total_amount?: number;
}

export type PaymentMethod = "cod" | "card" | "raast" | "wallet";
