/** Safepay + storefront payment method types */

export type SafepayEnvironment = "sandbox" | "production";

export type PaymentMethod = "cod" | "card" | "raast" | "wallet";

export type SafepaySessionParams = {
  amount: number;
  currency?: string;
  orderId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
};

export type SafepaySessionResult = {
  tracker: string;
  clientToken: string;
  orderId: string;
  environment: SafepayEnvironment;
  checkoutUrl?: string;
};

export type SafepayTrackerObject = {
  token: string;
};

export type SafepaySessionSetupData = {
  tracker: SafepayTrackerObject;
};

export type SafepaySessionSetupResponse = {
  data?: SafepaySessionSetupData;
};

export type SafepayPassportTokenData = {
  token?: string;
  access_token?: string;
};

export type SafepayPassportTokenResponse = {
  data?: string | SafepayPassportTokenData;
};

export type SafepayCustomerCreateResponse = {
  data?: {
    token?: string;
  };
};

export type SafepayWebhookHeaders = {
  signature: string | null;
  timestamp: string | null;
  eventId: string | null;
  eventType: string | null;
};

export type SafepayWebhookPayload = {
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
};

export type CreatePaymentSessionBody = {
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
};

/** Client checkout Safepay session state */
export type CheckoutSafepaySessionType = {
  tracker: string;
  clientToken: string;
  orderId: string;
  environment: "sandbox" | "production";
  checkoutUrl?: string;
  paymentMethod?: PaymentMethod;
};
