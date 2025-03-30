import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { UserRole } from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey"; // Change this in production

// Signup Controller
export async function signupController(name: string, email: string, password: string, role: string) {
  const client = await clientPromise;
  const db = client.db("dukandarshandar");
  const usersCollection = db.collection("users");

  // Check if user already exists
  const existingUser = await usersCollection.findOne({ email });
  if (existingUser) {
    return { success: false, error: "User already exists" };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  await usersCollection.insertOne({
    name,
    email,
    role,
    password: hashedPassword,
    createdAt: new Date(),
  });

  return { success: true, message: "User created successfully" };
}

// Login Controller
export async function loginController(email: string, password: string) {
  const client = await clientPromise;
  const db = client.db("dukandarshandar");
  const usersCollection = db.collection("users");

  // Find user
  const user = await usersCollection.findOne({ email });
  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }

  // Compare passwords
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return { success: false, error: "Invalid credentials" };
  }
  
  // Generate JWT Token
  const token = jwt.sign({ userId: user._id, email: user.email, userName: user.name, role:user.role }, JWT_SECRET, { expiresIn: "7d" });

  return { success: true, token, user: { name: user.name, email: user.email, role:user.role} };
}

// Guest Login Controller
export async function guestLoginController() {
  const token = jwt.sign(
    { userId: "guest", email: "guest@guest.com", userName: "Guest User", role: UserRole.GUEST },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { success: true, token, user: { name: "Guest User", email: "guest@guest.com", role: UserRole.GUEST } };
}