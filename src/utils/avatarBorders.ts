export type AvatarBorderCode =
  | "border_neon_blue"
  | "border_neon_pulse"
  | "border_royal_gem";

// Public assets (served from /public)
export const AVATAR_BORDER_ASSETS: Record<AvatarBorderCode, string> = {
  border_neon_blue: "/assets/rewards/border_neon_blue.png",
  border_neon_pulse: "/assets/rewards/border_neon_pulse.png",
  border_royal_gem: "/assets/rewards/border_royal_gem.png",
};

// Map level_rewards.item_code -> asset URL
export function resolveAvatarBorderAsset(itemCode?: string | null): string | undefined {
  if (!itemCode) return undefined;
  const key = itemCode.trim().toLowerCase();

  // Normalize common variants
  const aliases: Record<string, AvatarBorderCode> = {
    "border:neon_blue": "border_neon_blue",
    "border_neon_blue": "border_neon_blue",
    "neon_blue": "border_neon_blue",

    "border:neon_pulse": "border_neon_pulse", 
    "border_neon_pulse": "border_neon_pulse",
    "neon_pulse": "border_neon_pulse",
    "pulse_violet": "border_neon_pulse", // Level 4 reward

    "border:royal_gem": "border_royal_gem",
    "border_royal_gem": "border_royal_gem", 
    "royal_gem": "border_royal_gem",
  };

  const code = aliases[key as keyof typeof aliases] as AvatarBorderCode | undefined;
  if (code) return AVATAR_BORDER_ASSETS[code];

  return undefined;
}