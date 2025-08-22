import type { RewardItem } from "@/hooks/useRewardsTrack";

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function getNextRewardText(track: {
  free: RewardItem[];
  premium: RewardItem[];
  premiumActive: boolean;
  nextFree?: RewardItem;
  nextPremium?: RewardItem;
}) {
  const free = track.nextFree
    ? `Next: ${track.nextFree.value?.trim() || capitalize(track.nextFree.type)} @ L${track.nextFree.level}`
    : "All rewards unlocked";

  const premium = track.premiumActive && track.nextPremium
    ? `Next: ${track.nextPremium.value?.trim() || capitalize(track.nextPremium.type)} @ L${track.nextPremium.level}`
    : undefined;

  return { free, premium } as const;
}
