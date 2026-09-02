export const firebasePublicConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

/** Public web config — safe to check in the browser */
export function isFirebaseClientConfigured() {
  return Boolean(
    firebasePublicConfig.apiKey &&
      firebasePublicConfig.authDomain &&
      firebasePublicConfig.projectId
  );
}

/** Admin SDK credentials — server only (API routes) */
export function isFirebaseServerConfigured() {
  return Boolean(
    isFirebaseClientConfigured() &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

/** @deprecated use isFirebaseClientConfigured or isFirebaseServerConfigured */
export function isFirebaseConfigured() {
  return typeof window === "undefined" ? isFirebaseServerConfigured() : isFirebaseClientConfigured();
}

export function isChatEnabled() {
  if (process.env.NEXT_PUBLIC_CHAT_ENABLED === "false") return false;
  return typeof window === "undefined" ? isFirebaseServerConfigured() : isFirebaseClientConfigured();
}
