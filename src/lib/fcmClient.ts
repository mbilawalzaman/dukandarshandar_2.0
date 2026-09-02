"use client";

import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebaseClient";
import { authHeaders } from "@/lib/cart";

const DEVICE_ID_KEY = "fcm_device_id";
const PUSH_ENABLED_KEY = "fcm_push_enabled";

function getDeviceId() {
  if (typeof window === "undefined") return "web-device";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function isWebPushSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function isWebPushEnabled() {
  if (!isWebPushSupported()) return false;
  return Notification.permission === "granted" && localStorage.getItem(PUSH_ENABLED_KEY) === "true";
}

export function setWebPushEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  if (enabled) localStorage.setItem(PUSH_ENABLED_KEY, "true");
  else localStorage.removeItem(PUSH_ENABLED_KEY);
}

export async function registerWebPushToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const messaging = await getFirebaseMessaging();
  if (!messaging) return false;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return false;

  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  }

  const token = await getToken(messaging, { vapidKey });
  if (!token) return false;

  await fetch("/api/notifications/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      deviceId: getDeviceId(),
      token,
      userAgent: navigator.userAgent,
    }),
  });

  setWebPushEnabled(true);
  return true;
}

export async function unregisterWebPushToken() {
  if (typeof window === "undefined") return;
  const deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    setWebPushEnabled(false);
    return;
  }
  await fetch("/api/notifications/devices", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ deviceId }),
  }).catch(() => undefined);
  setWebPushEnabled(false);
}

export async function listenForForegroundMessages(onNotify: (title: string, body: string) => void) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => undefined;
  return onMessage(messaging, (payload) => {
    onNotify(payload.notification?.title || "Notification", payload.notification?.body || "");
  });
}

export { getDeviceId };
