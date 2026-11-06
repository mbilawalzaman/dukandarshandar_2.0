"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  type User,
} from "firebase/auth";

import { authFetch } from "@/lib/authFetch";

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
  const authUnsubscribeRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshFirebaseAuth = useCallback(async () => {
    if (!isChatEnabled()) {
      setReady(true);
      setFirebaseUser(null);

      return;
    }

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      setFirebaseUser(null);
      setReady(true);

      return;
    }

    try {
      const res = await authFetch("/api/firebase/token", {
        method: "POST",
        headers: authHeaders(),
      });

      const raw = await res.text();
      let data: { success?: boolean; token?: string; message?: string } = {};

      try {
        data = JSON.parse(raw);
      } catch {
        setError("Firebase authentication server error");
        setFirebaseUser(null);
        setReady(true);

        return;
      }

      if (!res.ok || !data.success) {
        setError(data.message || "Firebase auth failed");
        setFirebaseUser(null);
        setReady(true);

        return;
      }

      await signInWithCustomToken(getFirebaseAuth(), data.token!);
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

    const onAuthChange = () => {
      const token = localStorage.getItem("token");

      if (!token) {
        const authWasInitialized = Boolean(authUnsubscribeRef.current);

        authUnsubscribeRef.current?.();
        authUnsubscribeRef.current = null;
        setFirebaseUser(null);

        // Sign out only if this provider already initialized Firebase Auth.
        if (authWasInitialized) {
          void signOut(getFirebaseAuth()).catch(() => undefined);
        }

        setReady(true);

        return;
      }

      if (!authUnsubscribeRef.current) {
        authUnsubscribeRef.current = onAuthStateChanged(
          getFirebaseAuth(),
          (user) => setFirebaseUser(user),
        );
      }

      setReady(false);
      void refreshFirebaseAuth();
    };

    window.addEventListener("authChange", onAuthChange);
    window.addEventListener("storage", onAuthChange);
    onAuthChange();

    return () => {
      authUnsubscribeRef.current?.();
      authUnsubscribeRef.current = null;
      window.removeEventListener("authChange", onAuthChange);
      window.removeEventListener("storage", onAuthChange);
    };
  }, [refreshFirebaseAuth]);

  const value = useMemo(
    () => ({ ready, firebaseUser, error, refreshFirebaseAuth }),
    [ready, firebaseUser, error, refreshFirebaseAuth],
  );

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const ctx = useContext(FirebaseContext);

  if (!ctx) throw new Error("useFirebase must be used within FirebaseProvider");

  return ctx;
}
