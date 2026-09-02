import { isFirebaseServerConfigured } from "@/lib/firebaseConfig";

export async function safeNotify(task: () => Promise<unknown>) {
  if (!isFirebaseServerConfigured()) return;
  try {
    await task();
  } catch (error) {
    console.error("Notification dispatch failed:", error);
  }
}
