import type { AuthProviderType, UserRoleType } from "@/types/shared/authTypes";

/** Frontend/API user profile shape (not the Mongo document) */

export type UserProfileType = {
  id: string;
  name: string;
  email: string;
  needsEmail: boolean;
  phone: string;
  province?: string;
  city: string;
  area?: string;
  address: string;
  image: string;
  role: string;
  authProvider: string;
};

export type UserDisplayType = {
  name?: string | null;
  userName?: string | null;
  email?: string | null;
  image?: string | null;
  photoURL?: string | null;
  role?: string | null;
};

export type UserProfileUpdateType = {
  name?: string;
  email?: string;
  phone?: string;
  province?: string;
  city?: string;
  area?: string;
  address?: string;
  image?: string | null;
};

export type { AuthProviderType, UserRoleType };
