import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { UserRole } from "@/models/User";

export interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  created_at?: Date;
}

export const getUsers = async (): Promise<User[]> => {
  const db = await getDb();
  const users = await db.collection("users").find().project({ password: 0 }).toArray();
  return users.map((user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at || user.createdAt,
  })) as User[];
};

export const getUserById = async (userId: string): Promise<User | null> => {
  const db = await getDb();
  const user = await db.collection<User>("users").findOne({ _id: new ObjectId(userId) });
  return user || null;
};

export const createUser = async (user: User): Promise<User> => {
  const db = await getDb();
  const hashed = user.password ? await hashPassword(user.password) : undefined;
  const userData = {
    ...user,
    password: hashed,
    role: user.role || UserRole.USER,
    created_at: new Date(),
    createdAt: new Date(),
  };
  const result = await db.collection("users").insertOne(userData);
  return { ...userData, _id: result.insertedId };
};
