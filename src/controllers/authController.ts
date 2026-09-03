import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { UserRole } from "@/models/User";
import { getDb } from "@/lib/db";
import { safeNotify } from "@/lib/safeNotify";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { isFirebaseServerConfigured } from "@/lib/firebaseConfig";
import { issueGuestAccessToken, issueSessionForUser } from "@/lib/session";

export async function signupController(name: string, email: string, password: string, role: string) {
  const db = await getDb();
  const usersCollection = db.collection("users");

  const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return { success: false, error: "User already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userCount = await usersCollection.countDocuments();
  const assignedRole = userCount === 0 ? UserRole.ADMIN : role === UserRole.ADMIN ? UserRole.USER : role || UserRole.USER;

  await usersCollection.insertOne({
    name,
    email: email.toLowerCase(),
    role: assignedRole,
    password: hashedPassword,
    authProvider: "password",
    createdAt: new Date(),
    created_at: new Date(),
  });

  const created = await usersCollection.findOne({ email: email.toLowerCase() });
  if (created && assignedRole !== UserRole.ADMIN) {
    await safeNotify(async () => {
      const { notifyAdmins } = await import("@/services/notificationService");
      return notifyAdmins({
        type: "new_user",
        title: "New customer signup",
        body: `${name} (${email}) joined the store`,
        entityType: "user",
        entityId: String(created._id),
        idempotencyKey: `new_user:${created._id}`,
        sendPush: true,
        route: "/admin/users",
      });
    });
  }

  return { success: true, message: "User created successfully" };
}

export async function loginController(
  email: string,
  password: string,
  options?: { userAgent?: string }
) {
  const db = await getDb();
  const user = await db.collection("users").findOne({ email: email.toLowerCase() });
  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }

  if (!user.password) {
    return {
      success: false,
      error: "This account uses Google or Facebook. Please continue with social login.",
    };
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return { success: false, error: "Invalid credentials" };
  }

  const session = await issueSessionForUser(
    {
      _id: user._id as ObjectId,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    options
  );

  return {
    success: true,
    token: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user,
  };
}

export async function guestLoginController() {
  const session = issueGuestAccessToken();
  return {
    success: true,
    token: session.accessToken,
    user: session.user,
  };
}

function mapFirebaseProvider(signInProvider?: string): "google" | "facebook" | "firebase" {
  if (signInProvider === "google.com") return "google";
  if (signInProvider === "facebook.com") return "facebook";
  return "firebase";
}

function syntheticSocialEmail(firebaseUid: string, provider: "google" | "facebook" | "firebase") {
  const prefix = provider === "facebook" ? "fb" : provider === "google" ? "google" : "social";
  return `${prefix}_${firebaseUid}@users.dukandarshandar.local`.toLowerCase();
}

export async function socialLoginController(
  idToken: string,
  options?: { userAgent?: string }
) {
  if (!idToken || typeof idToken !== "string") {
    return { success: false, error: "Missing Firebase ID token" };
  }

  if (!isFirebaseServerConfigured()) {
    return { success: false, error: "Firebase Admin is not configured on the server" };
  }

  let decoded: {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
    firebase?: { sign_in_provider?: string };
  };

  try {
    decoded = await getAdminAuth().verifyIdToken(idToken);
  } catch (error) {
    console.error("Firebase ID token verification failed:", error);
    return { success: false, error: "Invalid or expired social login token" };
  }

  const firebaseUid = decoded.uid;
  const authProvider = mapFirebaseProvider(decoded.firebase?.sign_in_provider);

  // Token email is often missing for Facebook; also check Admin user record / providerData.
  let email = (decoded.email || "").toLowerCase();
  let emailFromProvider = Boolean(email);
  let name = decoded.name || "";
  let image = decoded.picture || "";

  if (!email || !name || !image) {
    try {
      const fbUser = await getAdminAuth().getUser(firebaseUid);
      if (!email) {
        const fromRecord =
          fbUser.email ||
          fbUser.providerData.find((p) => Boolean(p.email))?.email ||
          "";
        if (fromRecord) {
          email = fromRecord.toLowerCase();
          emailFromProvider = true;
        }
      }
      if (!name) name = fbUser.displayName || "";
      if (!image) image = fbUser.photoURL || "";
    } catch (error) {
      console.warn("Could not load Firebase user for social profile fallback:", error);
    }
  }

  const usedSyntheticEmail = !email;
  if (!email) {
    email = syntheticSocialEmail(firebaseUid, authProvider);
  }

  if (!name) {
    name =
      (emailFromProvider ? email.split("@")[0] : undefined) ||
      (authProvider === "facebook" ? "Facebook User" : "User");
  }
  const db = await getDb();
  const users = db.collection("users");

  let user = await users.findOne({ firebaseUid });
  if (!user && emailFromProvider) {
    user = await users.findOne({ email });
  }

  if (user) {
    const setFields: Record<string, unknown> = {
      firebaseUid,
      authProvider: user.authProvider === "password" ? user.authProvider : authProvider,
      updated_at: new Date(),
      ...(image ? { image } : {}),
      ...(!user.name ? { name } : {}),
    };

    // Upgrade synthetic → real email when provider finally returns one
    if (
      emailFromProvider &&
      user.email &&
      String(user.email).endsWith("@users.dukandarshandar.local") &&
      user.email !== email
    ) {
      setFields.email = email;
      setFields.needsEmail = false;
    } else if (usedSyntheticEmail && user.needsEmail !== false) {
      setFields.needsEmail = true;
    } else if (emailFromProvider) {
      setFields.needsEmail = false;
    }

    await users.updateOne({ _id: user._id }, { $set: setFields });
    user = await users.findOne({ _id: user._id });
  } else {
    const insert = {
      name,
      email,
      role: UserRole.USER,
      firebaseUid,
      authProvider,
      image: image || undefined,
      password: null,
      needsEmail: usedSyntheticEmail,
      createdAt: new Date(),
      created_at: new Date(),
    };
    const result = await users.insertOne(insert);
    user = await users.findOne({ _id: result.insertedId });

    if (user) {
      await safeNotify(async () => {
        const { notifyAdmins } = await import("@/services/notificationService");
        return notifyAdmins({
          type: "new_user",
          title: "New customer signup",
          body: `${name} (${emailFromProvider ? email : "no email"}) joined via ${authProvider}`,
          entityType: "user",
          entityId: String(user!._id),
          idempotencyKey: `new_user:${user!._id}`,
          sendPush: true,
          route: "/admin/users",
        });
      });
    }
  }

  if (!user) {
    return { success: false, error: "Could not create user account" };
  }

  const session = await issueSessionForUser(
    {
      _id: user._id as ObjectId,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    options
  );

  return {
    success: true,
    token: session.accessToken,
    refreshToken: session.refreshToken,
    user: {
      ...session.user,
      needsEmail: Boolean(user.needsEmail),
    },
  };
}
