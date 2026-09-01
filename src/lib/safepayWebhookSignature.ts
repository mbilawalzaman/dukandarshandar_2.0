import crypto from "crypto";
import { getSafepayWebhookSecret } from "@/lib/safepayConfig";

type SigningKeyStrategy = "hex-decode" | "base64-decode" | "utf8";

interface VerifyStrategy {
  name: string;
  algorithm: "sha256" | "sha512";
  requiresTimestamp: boolean;
  buildPayload: (timestamp: string, rawBody: string) => string;
  keyStrategy: SigningKeyStrategy;
}

interface VerifyDebugInfo {
  bodyLength: number;
  bodySha256: string;
  timestamp: string | null;
  signaturePrefix: string | null;
  signatureLength: number;
  secretFormat: "hex-64" | "base64-like" | "other";
  tried: string[];
}

export interface WebhookVerifyResult {
  valid: boolean;
  strategy?: string;
  debug: VerifyDebugInfo;
}

function deriveSigningKeys(secret: string): Array<{ strategy: SigningKeyStrategy; key: Buffer }> {
  const trimmed = secret.trim();
  const keys: Array<{ strategy: SigningKeyStrategy; key: Buffer }> = [];

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    keys.push({ strategy: "hex-decode", key: Buffer.from(trimmed, "hex") });
  }

  keys.push({ strategy: "utf8", key: Buffer.from(trimmed, "utf8") });

  try {
    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length > 0) {
      keys.push({ strategy: "base64-decode", key: decoded });
    }
  } catch {
    // ignore invalid base64
  }

  const seen = new Set<string>();
  return keys.filter(({ key, strategy }) => {
    const id = `${strategy}:${key.toString("base64")}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function computeDigest(algorithm: "sha256" | "sha512", key: Buffer, payload: string): string {
  return crypto.createHmac(algorithm, key).update(payload).digest("hex");
}

function signatureMatches(digest: string, provided: string): boolean {
  const normalized = provided.trim();
  const candidates = [`sha256=${digest}`, digest];
  if (digest.length === 128) {
    candidates.push(`sha512=${digest}`);
  }
  return candidates.some((candidate) => timingSafeEqualString(candidate, normalized));
}

const VERIFY_STRATEGIES: VerifyStrategy[] = [
  {
    name: "payments2-timestamp-body-sha256",
    algorithm: "sha256",
    requiresTimestamp: true,
    buildPayload: (timestamp, rawBody) => `${timestamp}.${rawBody}`,
    keyStrategy: "hex-decode",
  },
  {
    name: "payments2-timestamp-body-sha256-base64-key",
    algorithm: "sha256",
    requiresTimestamp: true,
    buildPayload: (timestamp, rawBody) => `${timestamp}.${rawBody}`,
    keyStrategy: "base64-decode",
  },
  {
    name: "payments2-timestamp-body-sha256-utf8-key",
    algorithm: "sha256",
    requiresTimestamp: true,
    buildPayload: (timestamp, rawBody) => `${timestamp}.${rawBody}`,
    keyStrategy: "utf8",
  },
  {
    name: "legacy-body-only-sha512-utf8-key",
    algorithm: "sha512",
    requiresTimestamp: false,
    buildPayload: (_timestamp, rawBody) => rawBody,
    keyStrategy: "utf8",
  },
  {
    name: "legacy-body-only-sha256-hex-key",
    algorithm: "sha256",
    requiresTimestamp: false,
    buildPayload: (_timestamp, rawBody) => rawBody,
    keyStrategy: "hex-decode",
  },
  {
    name: "legacy-body-only-sha256-utf8-key",
    algorithm: "sha256",
    requiresTimestamp: false,
    buildPayload: (_timestamp, rawBody) => rawBody,
    keyStrategy: "utf8",
  },
];

function secretFormat(secret: string): VerifyDebugInfo["secretFormat"] {
  const trimmed = secret.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return "hex-64";
  if (/^[A-Za-z0-9+/]+=*$/.test(trimmed)) return "base64-like";
  return "other";
}

export function verifySafepayWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null
): WebhookVerifyResult {
  const debug: VerifyDebugInfo = {
    bodyLength: rawBody.length,
    bodySha256: crypto.createHash("sha256").update(rawBody).digest("hex").slice(0, 16),
    timestamp,
    signaturePrefix: signature ? signature.slice(0, 12) : null,
    signatureLength: signature?.length ?? 0,
    secretFormat: secretFormat(getSafepayWebhookSecret()),
    tried: [],
  };

  if (!signature || !rawBody) {
    return { valid: false, debug };
  }

  const signingKeys = deriveSigningKeys(getSafepayWebhookSecret());

  for (const strategy of VERIFY_STRATEGIES) {
    if (strategy.requiresTimestamp && !timestamp) continue;

    const keyEntry = signingKeys.find((entry) => entry.strategy === strategy.keyStrategy);
    if (!keyEntry) continue;

    debug.tried.push(`${strategy.name}/${strategy.keyStrategy}`);

    const payload = strategy.buildPayload(timestamp || "", rawBody);
    const digest = computeDigest(strategy.algorithm, keyEntry.key, payload);

    if (signatureMatches(digest, signature)) {
      return { valid: true, strategy: `${strategy.name}/${strategy.keyStrategy}`, debug };
    }
  }

  return { valid: false, debug };
}
