"use client";

import React from "react";
import { Avatar, AvatarProps } from "@mui/material";
import { BRAND } from "@/lib/constants";
import {
  getAvatarSrc,
  getDisplayName,
  getUserInitials,
  type UserDisplayInput,
} from "@/lib/userDisplay";

type UserAvatarProps = {
  user?: UserDisplayInput | null;
  size?: number;
  sx?: AvatarProps["sx"];
} & Omit<AvatarProps, "src" | "children" | "sx">;

/** Shared avatar for Navbar, admin, profile, lists. */
export default function UserAvatar({ user, size = 40, sx, ...rest }: UserAvatarProps) {
  const src = getAvatarSrc(user);
  const initials = getUserInitials(user);
  const label = getDisplayName(user);

  return (
    <Avatar
      src={src || undefined}
      alt={label}
      sx={{
        width: size,
        height: size,
        bgcolor: BRAND.gold,
        color: BRAND.navy,
        fontWeight: 700,
        fontSize: size * 0.4,
        ...((sx as object) || {}),
      }}
      {...rest}
    >
      {!src ? initials : null}
    </Avatar>
  );
}
