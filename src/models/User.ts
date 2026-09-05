import type { ObjectId } from "mongodb";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  GUEST = "guest",
}

export interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  age?: number;
  role: UserRole;
  image?: string;
  phone?: string;
  province?: string;
  city?: string;
  area?: string;
  address?: string;
  password?: string | null;
  firebaseUid?: string;
  authProvider?: "password" | "google" | "facebook" | "firebase";
  /** True when email is a synthetic placeholder (e.g. Facebook without email claim). */
  needsEmail?: boolean;
  refreshTokens?: Array<{
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    userAgent?: string;
    revokedAt?: Date | null;
  }>;
}
