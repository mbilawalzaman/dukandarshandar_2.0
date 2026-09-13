// relative import so the Node test runner can load this file without path aliases
import { STORE_TIMEZONE, STORE_UTC_OFFSET_MINUTES } from "./constants.ts";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const OFFSET_MS = STORE_UTC_OFFSET_MINUTES * 60 * 1000;

/**
 * Day boundaries are computed in the store's timezone (Asia/Karachi, UTC+5, no DST),
 * not the server's local clock, so a promotion picked to end on "30 Sept" ends at
 * 23:59:59 PKT wherever the app is hosted.
 */

/** Calendar date (y, m, d) of an instant as seen in the store timezone. */
function storeCalendarDate(value: string | Date): [number, number, number] {
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return [y, m, d];
  }
  const shifted = new Date(new Date(value).getTime() + OFFSET_MS);
  return [shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate()];
}

/** 00:00:00.000 store time on that calendar day. */
export function startOfDay(value: string | Date): Date {
  const [y, m, d] = storeCalendarDate(value);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - OFFSET_MS);
}

/** 23:59:59.999 store time on that calendar day. */
export function endOfDay(value: string | Date): Date {
  const [y, m, d] = storeCalendarDate(value);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - OFFSET_MS);
}

/** "YYYY-MM-DD" in store time, for <input type="date"> values. */
export function toDateInputValue(value?: string | Date | null): string {
  if (!value) return "";
  const [y, m, d] = storeCalendarDate(value);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "13 Sep 2026" in store time. */
export function formatDate(value?: string | Date | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric", timeZone: STORE_TIMEZONE });
}

/** "13 Sep – 30 Sep 2026" */
export function formatDateRange(start?: string | Date | null, end?: string | Date | null): string {
  if (!start && !end) return "Always";
  return `${start ? formatDate(start) : "…"} – ${end ? formatDate(end) : "ongoing"}`;
}

/** Whole days remaining until `end` (0 when already passed). */
export function daysUntil(end: string | Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(end).getTime() - now.getTime()) / 86400000));
}
