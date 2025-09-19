import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSeason, useProgress, useRewards, useEntitlement } from "@/hooks/useSupabaseData";
import { resolveAvatarFrameAsset } from "@/utils/avatarFrames";
import { resolveAvatarBorderAsset } from "@/utils/avatarBorders";
export type RewardItem = {
  id: string;
  level: number; // level_required
  tier: "free" | "premium";
  type: "frame" | "border" | "badge" | "title" | "credits";
  value: string; // reward_value
  assetUrl?: string; // season_rewards.asset_url (fallback by type if null)
  state: "unlocked" | "claimable" | "locked";
};

export function useRewardsTrack() {
  const { season } = useSeason();
  const { level: currentLevel } = useProgress();
  const { freeRewards, premiumRewards } = useRewards();
  const { premiumActive } = useEntitlement();

  const FALLBACKS: Record<RewardItem["type"], string> = {
    badge: "/assets/rewards/badge_neon_blue.png",
    frame: "/assets/rewards/frame_royal_gem.png",
    border: "/assets/rewards/border_neon_pulse.png",
    credits: "/assets/rewards/credits.png",
    title: "/assets/rewards/title.png",
  };

  const mapToItem = (r: any): RewardItem => {
    const type = (r.reward_type as RewardItem["type"]) || "badge";
    const tier = (r.tier as "free" | "premium") || "free";
    const lvl = Number(r.level_required ?? 0);
    const unlocked = Boolean(r.unlocked);

    let state: RewardItem["state"] = "locked";
    if (unlocked) state = "unlocked";
    else if (lvl <= (currentLevel ?? 1) && (tier === "free" || premiumActive)) state = "claimable";

    // If premium not active, premium rewards stay locked regardless of level
    if (tier === "premium" && !premiumActive) state = "locked";

    // Compute asset URL with special handling for frames and borders
    const rawAsset: string | undefined = (r.asset_url as string) || undefined;
    const value: string = String(r.reward_value ?? r.item_code ?? "");
    const frameAsset = type === "frame" ? resolveAvatarFrameAsset(value) : undefined;
    const borderAsset = type === "border" ? resolveAvatarBorderAsset(value) : undefined;

    return {
      id: String(r.id),
      level: lvl,
      tier,
      type,
      value,
      assetUrl: rawAsset || frameAsset || borderAsset || FALLBACKS[type],
      state,
    };
  };

  const { free, premium } = useMemo(() => {
    const f = (freeRewards || []).map(mapToItem).sort((a, b) => a.level - b.level);
    const p = (premiumRewards || []).map(mapToItem).sort((a, b) => a.level - b.level);
    return { free: f, premium: p };
  }, [freeRewards, premiumRewards, currentLevel, premiumActive]);

  const [nonce, setNonce] = useState(0);

  // Realtime listeners: user_rewards and purchases
  useEffect(() => {
    const channel = supabase
      .channel("rewards-track")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_rewards" },
        () => setNonce((n) => n + 1)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchases" },
        () => setNonce((n) => n + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Derive next items (first locked at/after current level)
  const nextFree = useMemo(() => free.find((r) => r.level >= (currentLevel ?? 1) && r.state === "locked"), [free, currentLevel, nonce]);
  const nextPremium = useMemo(
    () => (premiumActive ? premium.find((r) => r.level >= (currentLevel ?? 1) && r.state === "locked") : undefined),
    [premium, currentLevel, premiumActive, nonce]
  );

  return {
    season,
    free,
    premium,
    currentLevel: currentLevel ?? 1,
    premiumActive: Boolean(premiumActive),
    nextFree,
    nextPremium,
  } as const;
}
