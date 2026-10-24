import { after } from "next/server";

/**
 * Runs non-blocking background operations (e.g., email notifications, push alerts).
 * In Next.js App Router / Vercel Serverless, this uses `after` to keep the lambda
 * execution context alive after returning the HTTP response immediately to the client.
 * Falls back gracefully when called outside an active request scope (e.g. tests or CLI).
 */
export function runBackground(task: () => Promise<unknown>): void {
  try {
    after(async () => {
      try {
        await task();
      } catch (error) {
        console.error("Background task error:", error);
      }
    });
  } catch {
    task().catch((error) => {
      console.error("Background task error:", error);
    });
  }
}
