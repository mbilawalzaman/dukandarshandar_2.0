"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";
import { firebasePublicConfig } from "@/lib/firebaseConfig";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let messaging: Messaging | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (getApps().length > 0) {
      app = getApps()[0]!;
    } else {
      app = initializeApp(firebasePublicConfig);
    }
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!(await isSupported())) return null;
  if (!messaging) {
    messaging = getMessaging(getFirebaseApp());
  }
  return messaging;
}
