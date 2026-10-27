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
  phone?: string;
  province?: string;
  city?: string;
  area?: string;
  address?: string;
  image?: string;
  authProvider?: string;
  created_at?: Date | string;
}

export const getUsers = async (): Promise<User[]> => {
  const db = await getDb();

  const users = await db
    .collection("users")
    .find()
    .project({
      name: 1,
      email: 1,
      role: 1,
      phone: 1,
      province: 1,
      city: 1,
      area: 1,
      address: 1,
      image: 1,
      authProvider: 1,
      created_at: 1,
      createdAt: 1,
    })
    .toArray();

  return users.map((user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    province: user.province,
    city: user.city,
    area: user.area,
    address: user.address,
    image: user.image,
    authProvider: user.authProvider,
    created_at: user.created_at || user.createdAt,
  })) as User[];
};

export const getUserById = async (userId: string): Promise<User | null> => {
  const db = await getDb();

  const user = await db.collection<User>("users").findOne(
    { _id: new ObjectId(userId) },
    {
      projection: {
        name: 1,
        email: 1,
        role: 1,
        phone: 1,
        province: 1,
        city: 1,
        area: 1,
        address: 1,
        image: 1,
        authProvider: 1,
        created_at: 1,
        createdAt: 1,
      },
    },
  );

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
