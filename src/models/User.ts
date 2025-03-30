import { ObjectId } from "mongodb";

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
}
