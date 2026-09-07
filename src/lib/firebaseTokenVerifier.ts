import jwt from "jsonwebtoken";

let googlePublicKeysCache: { keys: Record<string, string>; expiresAt: number } | null = null;

/**
 * Fetch Google's public RS256 certificates for Firebase ID token verification.
 * Cached in memory to avoid repeated HTTP calls.
 */
async function getGooglePublicKeys(): Promise<Record<string, string>> {
  const now = Date.now();
  if (googlePublicKeysCache && googlePublicKeysCache.expiresAt > now) {
    return googlePublicKeysCache.keys;
  }

  const res = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
  );
  if (!res.ok) {
    throw new Error("Failed to fetch Google public certificates for token verification");
  }

  const keys = (await res.json()) as Record<string, string>;
  
  // Parse Cache-Control header if present, fallback to 1 hour
  const cacheControl = res.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;

  googlePublicKeysCache = {
    keys,
    expiresAt: now + maxAgeSeconds * 1000,
  };

  return keys;
}

export type VerifiedFirebaseToken = {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  firebase?: { sign_in_provider?: string };
};

/**
 * Native, lightweight Firebase ID Token verifier using jsonwebtoken & Google's public certs.
 * Completely eliminates dependency on jwks-rsa / jose.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "dukandarshandar-134ff";

  const decodedHeader = jwt.decode(idToken, { complete: true });
  if (!decodedHeader || typeof decodedHeader === "string" || !decodedHeader.header.kid) {
    throw new Error("Invalid Firebase ID token format");
  }

  const keys = await getGooglePublicKeys();
  const publicKey = keys[decodedHeader.header.kid];
  if (!publicKey) {
    throw new Error("Google public key not found for token key ID");
  }

  const verified = jwt.verify(idToken, publicKey, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  }) as {
    uid?: string;
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
    firebase?: { sign_in_provider?: string };
  };

  return {
    uid: verified.uid || verified.sub,
    email: verified.email,
    name: verified.name,
    picture: verified.picture,
    firebase: verified.firebase,
  };
}
