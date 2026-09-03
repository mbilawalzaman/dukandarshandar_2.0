/** Auth / JWT / social login shared types */

export type UserRoleType = "admin" | "user" | "guest";

export type AuthProviderType = "password" | "google" | "facebook" | "firebase";

export type JwtPayloadType = {
  userId: string;
  email: string;
  userName: string;
  role: string;
};

/** Decoded client token fields used in Navbar / checkout */
export type UserTokenType = {
  userId?: string;
  userName?: string;
  email?: string;
  role?: string;
};

export type SocialProviderType = "google" | "facebook";
