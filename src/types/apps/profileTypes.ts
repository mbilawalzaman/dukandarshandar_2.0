import type { UserProfileType } from "@/types/shared/userTypes";

/** Profile page / ProfileEditor types */

export type ProfileDataType = UserProfileType;

/** @deprecated Prefer ProfileDataType — kept for existing ProfileEditor export */
export type ProfileData = ProfileDataType;

export type ProfileEditorProps = {
  loginNextPath?: string;
  showDelivery?: boolean;
};
