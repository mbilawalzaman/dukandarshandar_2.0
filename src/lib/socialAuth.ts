"use client";

import { GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, type AuthProvider } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import { isFirebaseClientConfigured } from "@/lib/firebaseConfig";

export type SocialProvider = "google" | "facebook";

function getProvider(provider: SocialProvider): AuthProvider {
  if (provider === "facebook") {
    const fb = new FacebookAuthProvider();
    fb.addScope("email");
    fb.addScope("public_profile");
    return fb;
  }
  const google = new GoogleAuthProvider();
  google.addScope("email");
  google.addScope("profile");
  return google;
}

/**
 * Firebase popup → ID token → /api/auth/social-login → app JWT cookies + localStorage token
 */
export async function signInWithSocial(provider: SocialProvider): Promise<{
  token: string;
  user: { name: string; email: string; role: string };
}> {
  if (!isFirebaseClientConfigured()) {
    throw new Error("Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars.");
  }

  const auth = getFirebaseAuth();
  const result = await signInWithPopup(auth, getProvider(provider));
  const idToken = await result.user.getIdToken();

  const res = await fetch("/api/auth/social-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken }),
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.token) {
    throw new Error(data.error || `${provider} login failed`);
  }

  return {
    token: data.token as string,
    user: data.user as { name: string; email: string; role: string },
  };
}
