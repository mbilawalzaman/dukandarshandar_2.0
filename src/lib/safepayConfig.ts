import type { SafepayEnvironment } from "@/types/safepay";

export function getSafepayEnvironment(): SafepayEnvironment {
  const env = process.env.SAFEPAY_ENV || process.env.NEXT_PUBLIC_SAFEPAY_ENV || "sandbox";
  return env === "production" ? "production" : "sandbox";
}

export function getSafepayApiBaseUrl(): string {
  return getSafepayEnvironment() === "production"
    ? "https://api.getsafepay.com"
    : "https://sandbox.api.getsafepay.com";
}

export function getSafepayPublicEnvironment(): SafepayEnvironment {
  const env = process.env.NEXT_PUBLIC_SAFEPAY_ENV || process.env.SAFEPAY_ENV || "sandbox";
  return env === "production" ? "production" : "sandbox";
}

export function isSafepayConfigured(): boolean {
  return Boolean(process.env.SAFEPAY_SECRET_KEY && process.env.SAFEPAY_API_KEY);
}

export function isSafepayWebhookConfigured(): boolean {
  return Boolean(process.env.SAFEPAY_WEBHOOK_SECRET);
}

export function getSafepayApiKey(): string {
  const key = process.env.SAFEPAY_API_KEY;
  if (!key) throw new Error("SAFEPAY_API_KEY is not configured");
  return key;
}

export function getSafepaySecretKey(): string {
  const key = process.env.SAFEPAY_SECRET_KEY;
  if (!key) throw new Error("SAFEPAY_SECRET_KEY is not configured");
  return key;
}

export function getSafepayWebhookSecret(): string {
  const secret = process.env.SAFEPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("SAFEPAY_WEBHOOK_SECRET is not configured");
  return secret;
}

/** Safepay amounts are in the smallest currency unit (e.g. paisa for PKR). */
export function toSafepayAmount(amountInRupees: number): number {
  return Math.round(Number(amountInRupees) * 100);
}
