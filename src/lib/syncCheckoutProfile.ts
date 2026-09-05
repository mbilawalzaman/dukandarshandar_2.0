import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { isSyntheticEmail, isValidCustomerEmail } from "@/lib/userDisplay";
import { issueSessionForUser, type IssuedSession } from "@/lib/session";

export type CheckoutShippingInput = {
  customer_name?: string;
  customer_email?: string;
  phone?: string;
  province?: string;
  city?: string;
  area?: string;
  address?: string;
};

/**
 * Persist checkout shipping fields onto the logged-in Mongo user
 * (email, phone, province, city, area, address, name) — same flow for COD and online pay.
 */
export async function syncCheckoutProfileToUser(
  userId: string | undefined | null,
  input: CheckoutShippingInput
): Promise<{ updated: boolean; session?: IssuedSession }> {
  if (!userId || userId === "guest" || !ObjectId.isValid(userId)) {
    return { updated: false };
  }

  const db = await getDb();
  const _id = new ObjectId(userId);
  const existingUser = await db.collection("users").findOne({ _id });
  if (!existingUser) return { updated: false };

  const profileUpdates: Record<string, unknown> = { updated_at: new Date() };
  let emailChanged = false;

  if (typeof input.phone === "string" && input.phone.trim()) {
    profileUpdates.phone = input.phone.trim();
  }
  if (typeof input.province === "string" && input.province.trim()) {
    profileUpdates.province = input.province.trim();
  }
  if (typeof input.city === "string" && input.city.trim()) {
    profileUpdates.city = input.city.trim();
  }
  if (typeof input.area === "string" && input.area.trim()) {
    profileUpdates.area = input.area.trim();
  }
  if (typeof input.address === "string" && input.address.trim()) {
    profileUpdates.address = input.address.trim();
  }
  if (typeof input.customer_name === "string" && input.customer_name.trim()) {
    profileUpdates.name = input.customer_name.trim();
  }

  const nextEmail = String(input.customer_email || "").trim().toLowerCase();
  if (isValidCustomerEmail(nextEmail)) {
    const emailTaken = await db.collection("users").findOne({
      email: nextEmail,
      _id: { $ne: _id },
    });
    if (
      !emailTaken &&
      (isSyntheticEmail(String(existingUser.email || "")) ||
        existingUser.needsEmail ||
        String(existingUser.email || "").toLowerCase() !== nextEmail)
    ) {
      profileUpdates.email = nextEmail;
      profileUpdates.needsEmail = false;
      emailChanged = true;
    }
  }

  // Only updated_at → nothing meaningful to write
  if (Object.keys(profileUpdates).length <= 1) {
    return { updated: false };
  }

  await db.collection("users").updateOne({ _id }, { $set: profileUpdates });

  const nameChanged =
    typeof profileUpdates.name === "string" && profileUpdates.name !== existingUser.name;

  if (emailChanged || nameChanged) {
    const refreshed = await db.collection("users").findOne({ _id });
    if (refreshed) {
      const session = await issueSessionForUser({
        _id: refreshed._id,
        name: String(refreshed.name),
        email: String(refreshed.email),
        role: String(refreshed.role),
      });
      return { updated: true, session };
    }
  }

  return { updated: true };
}
