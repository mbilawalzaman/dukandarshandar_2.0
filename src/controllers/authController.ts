import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "@/lib/auth";
import { UserRole } from "@/models/User";
import { getDb } from "@/lib/db";
import { safeNotify } from "@/lib/safeNotify";
import { notifyAdmins } from "@/services/notificationService";

const JWT_SECRET = getJwtSecret();

export async function signupController(name: string, email: string, password: string, role: string) {
  const db = await getDb();
  const usersCollection = db.collection("users");

  const existingUser = await usersCollection.findOne({ email });
  if (existingUser) {
    return { success: false, error: "User already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userCount = await usersCollection.countDocuments();
  const assignedRole = userCount === 0 ? UserRole.ADMIN : role === UserRole.ADMIN ? UserRole.USER : role || UserRole.USER;

  await usersCollection.insertOne({
    name,
    email,
    role: assignedRole,
    password: hashedPassword,
    createdAt: new Date(),
    created_at: new Date(),
  });

  const created = await usersCollection.findOne({ email });
  if (created && assignedRole !== UserRole.ADMIN) {
    await safeNotify(() =>
      notifyAdmins({
        type: "new_user",
        title: "New customer signup",
        body: `${name} (${email}) joined the store`,
        entityType: "user",
        entityId: String(created._id),
        idempotencyKey: `new_user:${created._id}`,
        sendPush: true,
        route: "/admin/users",
      })
    );
  }

  return { success: true, message: "User created successfully" };
}

export async function loginController(email: string, password: string) {
  const db = await getDb();
  const user = await db.collection("users").findOne({ email });
  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return { success: false, error: "Invalid credentials" };
  }

  const token = jwt.sign(
    { userId: String(user._id), email: user.email, userName: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { success: true, token, user: { name: user.name, email: user.email, role: user.role } };
}

export async function guestLoginController() {
  const token = jwt.sign(
    { userId: "guest", email: "guest@guest.com", userName: "Guest User", role: UserRole.GUEST },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { success: true, token, user: { name: "Guest User", email: "guest@guest.com", role: UserRole.GUEST } };
}
