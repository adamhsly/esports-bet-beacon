// Centralized reward asset resolution
// Maps reward_type + reward_value to correct asset paths

export type RewardType = 'badge' | 'border' | 'frame' | 'title' | 'credits';

interface RewardAssetConfig {
  reward_type: RewardType;
  reward_value: string;
}

// Known badge mappings (add more as badges are created)
const BADGE_ASSETS: Record<string, string> = {
  // Starter badges
  'badge_starter_bronze': '/assets/rewards/badge_starter_bronze.png',
  'badge_starter_silver': '/assets/rewards/badge_starter_silver.png',
  'badge_starter_gold_anim': '/assets/rewards/badge_starter_gold_anim.png',
  
  // Season survivor
  'badge_season_survivor_silver': '/assets/rewards/badge_season_survivor_silver.png',
  
  // Underdog badges
  'badge_underdog_bronze': '/assets/rewards/badge_underdog_bronze.png',
  'badge_underdog_gold_anim': '/assets/rewards/badge_underdog_gold_anim.png',
  
  // Elite badges
  'badge_elite_static': '/assets/rewards/badge_elite_static.png',
  'badge_legend_diamond_anim': '/assets/rewards/badge_legend_diamond_anim.png',
  
  // Neon/special badges
  'badge_neon_blue': '/assets/rewards/badge_neon_blue.png',
  
  // Hall of fame
  'badge_hof_crown': '/assets/rewards/badge_hof_crown.png',
};

const BORDER_ASSETS: Record<string, string> = {
  'border_neon_blue': '/assets/rewards/border_neon_blue.png',
  'border_neon_pulse': '/assets/rewards/border_neon_pulse.png',
  'border_royal_gem': '/assets/rewards/border_royal_gem.png',
  'border_steel_static': '/assets/rewards/border_steel_static.png',
  'border_arcane_violet': '/assets/rewards/border_arcane_violet.png',
  'border_sunforge_gold_anim': '/assets/rewards/border_sunforge_gold_anim.png',
};

const FRAME_ASSETS: Record<string, string> = {
  'frame_neon_pulse': '/assets/rewards/frames/neon_pulse.svg',
  'frame_royal_gem': '/assets/rewards/frames/royal_gem.svg',
  'frame_cyber_gold': '/assets/rewards/frames/cyber_gold.svg',
  'frame_basic_static': '/assets/rewards/frames/frame_basic_static.svg',
  'frame_pulse_violet_anim': '/assets/rewards/frames/frame_pulse_violet_anim.svg',
};

/**
 * Resolve reward asset URL based on reward_type and reward_value
 * Returns undefined if asset path cannot be determined
 */
export function resolveRewardAsset(config: RewardAssetConfig): string | undefined {
  const { reward_type, reward_value } = config;
  
  if (!reward_value) return undefined;
  
  const normalized = reward_value.trim().toLowerCase();
  
  switch (reward_type) {
    case 'badge':
      return BADGE_ASSETS[normalized];
      
    case 'border':
      return BORDER_ASSETS[normalized];
      
    case 'frame':
      return FRAME_ASSETS[normalized];
      
    case 'title':
      // Titles don't have visual assets
      return undefined;
      
    case 'credits':
      // Credits use a generic icon
      return '/assets/rewards/credits.png';
      
    default:
      return undefined;
  }
}

/**
 * Get a fallback placeholder for missing reward assets
 */
export function getRewardPlaceholder(rewardType: RewardType): string {
  // Simple colored square placeholders as data URIs
  const placeholders: Record<RewardType, string> = {
    badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiBmaWxsPSIjMzc0MTUxIiByeD0iOCIvPjx0ZXh0IHg9IjI4IiB5PSIzNCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOUNBM0FGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj4/PC90ZXh0Pjwvc3ZnPg==',
    border: '',
    frame: '',
    title: '',
    credits: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiBmaWxsPSIjRjVDMDQyIiByeD0iOCIvPjx0ZXh0IHg9IjI4IiB5PSIzOCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjMyIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzFBMUEyRSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+JDwvdGV4dD48L3N2Zz4=',
  };
  
  return placeholders[rewardType] || '';
}

/**
 * Safely resolve reward asset with fallback
 */
export function resolveRewardAssetSafe(config: RewardAssetConfig): string {
  const resolved = resolveRewardAsset(config);
  if (resolved) return resolved;
  
  return getRewardPlaceholder(config.reward_type);
}
