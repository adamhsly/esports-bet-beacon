import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveAvatarFrameAsset } from "@/utils/avatarFrames";
import { resolveAvatarBorderAsset } from "@/utils/avatarBorders";

export type LevelRewardItem = {
  id: string;
  level: number;
  track: "free" | "premium";
  reward_type: string;
  item_code: string | null;
  amount: number | null;
  assetUrl?: string;
  unlocked: boolean;
};

export function useLevelRewardsTrack(userLevel: number = 1, isPremium: boolean = false) {
  const { user } = useAuth();
  const [levelRewards, setLevelRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRewards = async () => {
      setLoading(true);
      
      // Fetch all level rewards
      const { data: rewards } = await supabase
        .from("level_rewards")
        .select("*")
        .order("level", { ascending: true });

      if (rewards) {
        setLevelRewards(rewards);
      }

      setLoading(false);
    };

    fetchRewards();
  }, [user]);

  const mapToItem = (r: any): LevelRewardItem => {
    // Determine if unlocked based on level and track
    const isUnlocked = r.level <= userLevel && (r.track === "free" || (r.track === "premium" && isPremium));
    
    // Resolve asset URL for frames and borders
    let assetUrl: string | undefined;
    if (r.reward_type === "item" && r.item_code) {
      if (r.item_code.startsWith("frame_")) {
        assetUrl = resolveAvatarFrameAsset(r.item_code);
      } else if (r.item_code.startsWith("border_")) {
        assetUrl = resolveAvatarBorderAsset(r.item_code);
      } else if (r.item_code.startsWith("badge_")) {
        assetUrl = `/assets/rewards/${r.item_code}.png`;
      }
    }

    return {
      id: r.id,
      level: r.level,
      track: r.track,
      reward_type: r.reward_type,
      item_code: r.item_code,
      amount: r.amount,
      assetUrl,
      unlocked: isUnlocked,
    };
  };

  const freeRewards = useMemo(
    () => levelRewards.filter((r) => r.track === "free").map(mapToItem),
    [levelRewards, userLevel, isPremium]
  );

  const premiumRewards = useMemo(
    () => levelRewards.filter((r) => r.track === "premium").map(mapToItem),
    [levelRewards, userLevel, isPremium]
  );

  const nextFree = useMemo(
    () => freeRewards.find((r) => !r.unlocked),
    [freeRewards]
  );

  const nextPremium = useMemo(
    () => premiumRewards.find((r) => !r.unlocked),
    [premiumRewards]
  );

  return {
    loading,
    free: freeRewards,
    premium: premiumRewards,
    nextFree,
    nextPremium,
  };
}
