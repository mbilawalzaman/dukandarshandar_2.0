/** Helper functions for Guest Checkout details and localStorage persistence. */

export interface GuestCheckoutInfo {
  customer_name: string;
  customer_email: string;
  phone: string;
  province?: string;
  city: string;
  area?: string;
  address: string;
}

export const GUEST_CHECKOUT_STORAGE_KEY = "guestCheckoutInfo";

export function isGuestUser(user?: { role?: string | null; userName?: string | null; email?: string | null } | null): boolean {
  if (!user) return false;
  if (user.role === "guest") return true;
  if (user.userName === "Guest User" || user.email === "guest@guest.com") return true;
  return false;
}

export function getGuestCheckoutInfo(): GuestCheckoutInfo {
  if (typeof window === "undefined") {
    return { customer_name: "", customer_email: "", phone: "", province: "", city: "", area: "", address: "" };
  }
  try {
    const raw = localStorage.getItem(GUEST_CHECKOUT_STORAGE_KEY);
    if (!raw) return { customer_name: "", customer_email: "", phone: "", province: "", city: "", area: "", address: "" };
    const parsed = JSON.parse(raw);
    const name = typeof parsed.customer_name === "string" ? parsed.customer_name.trim() : "";
    const email = typeof parsed.customer_email === "string" ? parsed.customer_email.trim() : "";
    const phone = typeof parsed.phone === "string" ? parsed.phone.trim() : "";
    const province = typeof parsed.province === "string" ? parsed.province.trim() : "";
    const city = typeof parsed.city === "string" ? parsed.city.trim() : "";
    const area = typeof parsed.area === "string" ? parsed.area.trim() : "";
    const address = typeof parsed.address === "string" ? parsed.address.trim() : "";

    return {
      customer_name: /^guest(\s*user)?$/i.test(name) ? "" : name,
      customer_email: email.toLowerCase() === "guest@guest.com" ? "" : email,
      phone,
      province,
      city,
      area,
      address,
    };
  } catch {
    return { customer_name: "", customer_email: "", phone: "", province: "", city: "", area: "", address: "" };
  }
}

export function saveGuestCheckoutInfo(info: GuestCheckoutInfo): void {
  if (typeof window === "undefined") return;
  try {
    const cleanName = info.customer_name?.trim() || "";
    const cleanEmail = info.customer_email?.trim() || "";

    const toSave: GuestCheckoutInfo = {
      customer_name: /^guest(\s*user)?$/i.test(cleanName) ? "" : cleanName,
      customer_email: cleanEmail.toLowerCase() === "guest@guest.com" ? "" : cleanEmail,
      phone: info.phone?.trim() || "",
      province: info.province?.trim() || "",
      city: info.city?.trim() || "",
      area: info.area?.trim() || "",
      address: info.address?.trim() || "",
    };

    localStorage.setItem(GUEST_CHECKOUT_STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error("Error saving guest checkout info:", error);
  }
}
