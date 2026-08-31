import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyToken, requireAdmin } from "@/lib/auth";
import { createUser, getUsers, getUserById } from "@/controllers/userController";
import { UserRole } from "@/models/User";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: "Invalid Token" }, { status: 403 });
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("id");

    if (userId) {
      if (decoded.role !== "admin" && decoded.userId !== userId) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      const user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, user });
    }

    if (decoded.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const users = await getUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = requireAdmin(req);
    if (!admin.ok) return admin.response;

    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const assignedRole = Object.values(UserRole).includes(role) ? role : UserRole.USER;
    const createdUser = await createUser({
      name,
      email,
      password,
      role: assignedRole,
    });

    return NextResponse.json({ success: true, userId: createdUser._id }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ success: false, error: "Failed to create user" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = requireAdmin(req);
    if (!admin.ok) return admin.response;

    const { _id, role } = await req.json();
    if (!_id || !role) {
      return NextResponse.json({ success: false, error: "User id and role are required" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("users").updateOne({ _id: new ObjectId(_id) }, { $set: { role } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 });
  }
}
