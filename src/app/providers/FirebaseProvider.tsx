"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithCustomToken, signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import { isChatEnabled } from "@/lib/firebaseConfig";
import { authHeaders } from "@/lib/cart";

type FirebaseContextValue = {
  ready: boolean;
  firebaseUser: User | null;
  error: string | null;
  refreshFirebaseAuth: () => Promise<void>;
};

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshFirebaseAuth = useCallback(async () => {
    if (!isChatEnabled()) {
      setReady(true);
      setFirebaseUser(null);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      try {
        await signOut(getFirebaseAuth());
      } catch {
        /* ignore */
      }
      setFirebaseUser(null);
      setReady(true);
      return;
    }

    try {
      const res = await fetch("/api/firebase/token", {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Firebase auth failed");
        setFirebaseUser(null);
        setReady(true);
        return;
      }
      await signInWithCustomToken(getFirebaseAuth(), data.token);
      setError(null);
    } catch (err) {
      console.error("Firebase sign-in error:", err);
      setError("Failed to connect to Firebase");
      setFirebaseUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isChatEnabled()) {
      setReady(true);
      return;
    }

    refreshFirebaseAuth();

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });

    const onAuthChange = () => {
      setReady(false);
      refreshFirebaseAuth();
    };
    window.addEventListener("authChange", onAuthChange);
    window.addEventListener("storage", onAuthChange);

    return () => {
      unsub();
      window.removeEventListener("authChange", onAuthChange);
      window.removeEventListener("storage", onAuthChange);
    };
  }, [refreshFirebaseAuth]);

  const value = useMemo(
    () => ({ ready, firebaseUser, error, refreshFirebaseAuth }),
    [ready, firebaseUser, error, refreshFirebaseAuth]
  );

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

export function useFirebase() {
  const ctx = useContext(FirebaseContext);
  if (!ctx) throw new Error("useFirebase must be used within FirebaseProvider");
  return ctx;
}
