import { getAdminAuth } from "@/lib/firebaseAdmin";
import type { JwtPayload } from "@/lib/auth";
import { UserRole } from "@/models/User";

export async function createFirebaseCustomToken(user: JwtPayload) {
  if (user.role === UserRole.GUEST || user.userId === "guest") {
    return { success: false as const, message: "Guest users cannot use Firebase features", status: 403 };
  }

  if (!user.userId) {
    return { success: false as const, message: "Invalid user session", status: 401 };
  }

  const role = user.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER;
  const claims =
    role === UserRole.ADMIN
      ? { role: UserRole.ADMIN, admin: true }
      : { role: UserRole.USER };

  try {
    const token = await getAdminAuth().createCustomToken(String(user.userId), claims);
    return { success: true as const, token };
  } catch (error) {
    console.error("Firebase custom token error:", error);
    return { success: false as const, message: "Failed to create Firebase token", status: 500 };
  }
}
