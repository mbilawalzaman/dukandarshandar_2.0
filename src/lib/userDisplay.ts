/** Shared user/avatar display helpers — use everywhere instead of inline logic. */

export const SYNTHETIC_EMAIL_SUFFIX = "@users.dukandarshandar.local";

export type UserDisplayInput = {
  name?: string | null;
  userName?: string | null;
  email?: string | null;
  image?: string | null;
  photoURL?: string | null;
  role?: string | null;
};

export function getDisplayName(user?: UserDisplayInput | null): string {
  const name = (user?.name || user?.userName || "").trim();
  if (name) return name;
  const email = getDisplayEmail(user);
  if (email) return email.split("@")[0] || "User";
  if (user?.role === "guest") return "Guest";
  return "User";
}

export function isSyntheticEmail(email?: string | null): boolean {
  if (!email) return false;
  const value = email.trim().toLowerCase();
  return value.endsWith(SYNTHETIC_EMAIL_SUFFIX) || value === "guest@guest.com";
}

/** Email safe to show in UI / prefill forms (hides synthetic Facebook placeholders). */
export function getDisplayEmail(user?: UserDisplayInput | null): string {
  const email = (user?.email || "").trim();
  if (!email || isSyntheticEmail(email)) return "";
  return email;
}

export function isValidCustomerEmail(email: string): boolean {
  const value = email.trim().toLowerCase();
  if (!value || isSyntheticEmail(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Single letter (or two) for Avatar fallback. */
export function getUserInitials(user?: UserDisplayInput | string | null): string {
  const raw =
    typeof user === "string"
      ? user
      : getDisplayName(user);
  const cleaned = raw.trim();
  if (!cleaned) return "U";

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] || ""}${parts[1]![0] || ""}`.toUpperCase();
  }
  return cleaned.slice(0, 1).toUpperCase();
}

/** Profile image URL if present; otherwise null (caller shows initials). */
export function getAvatarSrc(user?: UserDisplayInput | null): string | null {
  const src = (user?.image || user?.photoURL || "").trim();
  return src || null;
}
