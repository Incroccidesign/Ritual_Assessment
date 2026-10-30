export const PROFILE_AVATAR_IDS = ["01", "02", "03", "04", "05", "06"] as const;

export type ProfileAvatarId = (typeof PROFILE_AVATAR_IDS)[number];

export function isProfileAvatarId(value: unknown): value is ProfileAvatarId {
  return typeof value === "string" && PROFILE_AVATAR_IDS.includes(value as ProfileAvatarId);
}

export function profileAvatarPath(value: unknown): string {
  const id = isProfileAvatarId(value) ? value : PROFILE_AVATAR_IDS[0];
  return `/avatars/profile-${id}.webp`;
}
