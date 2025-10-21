export type AvatarFrameCode =
  | "frame_basic_static"
  | "frame_neon_pulse"
  | "frame_royal_gem"
  | "frame_cyber_gold"
  | "frame_pulse_violet_anim";

// Public assets (served from /public)
export const AVATAR_FRAME_ASSETS: Record<AvatarFrameCode, string> = {
  frame_basic_static: "/assets/rewards/frames/frame_basic_static.svg",
  frame_neon_pulse: "/assets/rewards/frames/neon_pulse.svg",
  frame_royal_gem: "/assets/rewards/frames/royal_gem.svg",
  frame_cyber_gold: "/assets/rewards/frames/cyber_gold.svg",
  frame_pulse_violet_anim: "/assets/rewards/frames/frame_pulse_violet_anim.svg",
};

// Map level_rewards.item_code -> asset URL
export function resolveAvatarFrameAsset(itemCode?: string | null): string | undefined {
  if (!itemCode) return undefined;
  const key = itemCode.trim().toLowerCase();

  // Normalize common variants
  const aliases: Record<string, AvatarFrameCode> = {
    "frame:basic_static": "frame_basic_static",
    "frame_basic_static": "frame_basic_static",
    "basic_static": "frame_basic_static",

    "frame:neon_pulse": "frame_neon_pulse",
    "frame_neon_pulse": "frame_neon_pulse",
    "neon_pulse": "frame_neon_pulse",

    "frame:royal_gem": "frame_royal_gem",
    "frame_royal_gem": "frame_royal_gem",
    "royal_gem": "frame_royal_gem",

    "frame:cyber_gold": "frame_cyber_gold",
    "frame_cyber_gold": "frame_cyber_gold",
    "cyber_gold": "frame_cyber_gold",

    "frame:pulse_violet_anim": "frame_pulse_violet_anim",
    "frame_pulse_violet_anim": "frame_pulse_violet_anim",
    "pulse_violet_anim": "frame_pulse_violet_anim",
  };

  const code = aliases[key as keyof typeof aliases] as AvatarFrameCode | undefined;
  if (code) return AVATAR_FRAME_ASSETS[code];

  return undefined;
}
