export type AvatarBorderCode =
  | "border_neon_blue"
  | "border_neon_pulse"
  | "border_royal_gem"
  | "border_arcane_violet"
  | "border_steel_static"
  | "border_sunforge_gold_anim";

// Public assets (served from /public)
export const AVATAR_BORDER_ASSETS: Record<AvatarBorderCode, string> = {
  border_neon_blue: "/assets/rewards/border_neon_blue.png",
  border_neon_pulse: "/assets/rewards/border_neon_pulse.png",
  border_royal_gem: "/assets/rewards/border_royal_gem.png",
  border_arcane_violet: "/assets/rewards/border_arcane_violet.png",
  border_steel_static: "/assets/rewards/border_steel_static.png",
  border_sunforge_gold_anim: "/assets/rewards/border_sunforge_gold_anim.png",
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

    "border:royal_gem": "border_royal_gem",
    "border_royal_gem": "border_royal_gem", 
    "royal_gem": "border_royal_gem",

    "border:arcane_violet": "border_arcane_violet",
    "border_arcane_violet": "border_arcane_violet",
    "arcane_violet": "border_arcane_violet",

    "border:steel_static": "border_steel_static",
    "border_steel_static": "border_steel_static",
    "steel_static": "border_steel_static",

    "border:sunforge_gold_anim": "border_sunforge_gold_anim",
    "border_sunforge_gold_anim": "border_sunforge_gold_anim",
    "sunforge_gold_anim": "border_sunforge_gold_anim",
  };

  const code = aliases[key as keyof typeof aliases] as AvatarBorderCode | undefined;
  if (code) return AVATAR_BORDER_ASSETS[code];

  return undefined;
}