import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface WelcomeOfferStatus {
  tier: number;
  totalSpentPence: number;
  thresholdPence: number;
  offerClaimed: boolean;
  promoBalancePence: number;
  promoExpiresAt: string | null;
  rewardPence: number;
  tier1Complete: boolean;
  hasUsedPromoEntry: boolean;
}

async function fetchWelcomeOfferStatus(userId: string): Promise<WelcomeOfferStatus> {
  const { data, error: rpcError } = await supabase.rpc('get_welcome_offer_status', { p_user_id: userId });

  if (rpcError) {
    console.error('Error fetching welcome offer status:', rpcError);
    throw new Error(rpcError.message);
  }

  const result = data as
    | {
        tier?: number;
        total_spent_pence?: number;
        threshold_pence?: number;
        offer_claimed?: boolean;
        promo_balance_pence?: number;
        promo_expires_at?: string;
        reward_pence?: number;
        tier1_complete?: boolean;
      }
    | null;

  // Prefer profile values when available.
  let offerClaimed = result?.offer_claimed ?? false;
  let promoBalancePence = result?.promo_balance_pence ?? 0;
  let promoExpiresAt: string | null = result?.promo_expires_at ?? null;

  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('welcome_offer_claimed, promo_balance_pence, promo_expires_at')
      .eq('id', userId)
      .maybeSingle();

    if (!profileError && profileData) {
      offerClaimed = (profileData as any).welcome_offer_claimed ?? offerClaimed;
      promoBalancePence = (profileData as any).promo_balance_pence ?? promoBalancePence;
      promoExpiresAt = (profileData as any).promo_expires_at ?? promoExpiresAt;
    }
  } catch {
    // ignore - fall back to RPC values
  }

  // Check if user has ever used a promo-covered entry (prevents double free entry in UI)
  let hasUsedPromoEntry = false;
  try {
    const { data: promoEntries, error: promoError } = await supabase
      .from('round_entries')
      .select('id')
      .eq('user_id', userId)
      .gt('promo_used', 0)
      .eq('status', 'completed')
      .limit(1);

    if (!promoError && promoEntries && promoEntries.length > 0) {
      hasUsedPromoEntry = true;
    }
  } catch {
    // ignore - default to false
  }

  return {
    tier: result?.tier ?? 1,
    totalSpentPence: result?.total_spent_pence ?? 0,
    thresholdPence: result?.threshold_pence ?? 0,
    offerClaimed,
    promoBalancePence,
    promoExpiresAt,
    rewardPence: result?.reward_pence ?? 1000,
    tier1Complete: result?.tier1_complete ?? false,
    hasUsedPromoEntry,
  };
}

export function useWelcomeOffer() {
  const { user } = useAuth();
  

  const query = useQuery({
    queryKey: ['welcomeOffer', user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchWelcomeOfferStatus(user!.id),
  });

  const status = query.data ?? null;

  // Detect when user just unlocked tier 2 (first time showing tier 2 info)
  const justUnlockedTier2 = useMemo(() => {
    if (!user?.id || !status) return false;

    // Don't show unlock popup if they already claimed tier 2
    if (status.tier === 2 && status.offerClaimed) return false;

    // Check if we've stored that this user has already seen the tier 2 unlock popup
    const tier2UnlockSeenKey = `tier2UnlockSeenV2_${user.id}`;
    const tier2UnlockSeen = localStorage.getItem(tier2UnlockSeenKey) === 'true';

    // If tier 2 and not yet seen the unlock popup
    return status.tier === 2 && !tier2UnlockSeen;
  }, [status, user?.id]);

  // Track when tier 2 popup is shown (first time)
  const markTier2UnlockSeen = useCallback(() => {
    if (!user?.id) return;
    localStorage.setItem(`tier2UnlockSeenV2_${user.id}`, 'true');
  }, [user?.id]);

  // Check if we should show tier 2 popup on login (2nd time)
  const shouldShowTier2OnLogin = useMemo(() => {
    if (!user?.id || !status || status.tier !== 2) return false;

    // Don't show login popup if they already claimed tier 2
    if (status.offerClaimed) return false;

    // Only show if tier 2 unlock was seen but this is a new login/session
    const tier2UnlockSeenKey = `tier2UnlockSeenV2_${user.id}`;
    const tier2LoginShownKey = `tier2LoginShownV2_${user.id}`;
    const tier2SessionKey = `tier2ShownThisSessionV2_${user.id}`;

    const tier2UnlockSeen = localStorage.getItem(tier2UnlockSeenKey) === 'true';
    const tier2LoginShown = localStorage.getItem(tier2LoginShownKey) === 'true';
    const shownThisSession = sessionStorage.getItem(tier2SessionKey) === 'true';

    // Show if: unlock was seen, haven't shown on login yet, and not shown this session
    return tier2UnlockSeen && !tier2LoginShown && !shownThisSession;
  }, [status, user?.id]);

  // Mark tier 2 login popup as shown (second time)
  const markTier2LoginShown = useCallback(() => {
    if (!user?.id) return;
    localStorage.setItem(`tier2LoginShownV2_${user.id}`, 'true');
    sessionStorage.setItem(`tier2ShownThisSessionV2_${user.id}`, 'true');
  }, [user?.id]);

  const progressPercent = useMemo(() => {
    if (!status || status.thresholdPence === 0) return 0;
    return Math.min(100, Math.round((status.totalSpentPence / status.thresholdPence) * 100));
  }, [status]);

  const daysRemaining = useMemo(() => {
    return status?.promoExpiresAt
      ? Math.max(
          0,
          Math.ceil((new Date(status.promoExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        )
      : null;
  }, [status?.promoExpiresAt]);

  const isExpired = useMemo(() => {
    return status?.promoExpiresAt ? new Date(status.promoExpiresAt).getTime() < Date.now() : false;
  }, [status?.promoExpiresAt]);

  // Display state logic considering tiers
  const displayState: 'progress' | 'active' | 'expired' | 'completed' | null = useMemo(() => {
    if (!status) return null;
    
    // Has active promo balance and not expired
    if (status.promoBalancePence > 0 && !isExpired) {
      return 'active';
    }
    
    // Has promo balance but expired
    if (status.promoBalancePence > 0 && isExpired) {
      return 'expired';
    }
    
    // Tier 1: Free bonus not yet claimed AND user hasn't already used their free entry
    // CRITICAL: hasUsedPromoEntry prevents showing "Claim Free Entry" after using it
    if (status.tier === 1 && !status.offerClaimed && !status.hasUsedPromoEntry) {
      return 'progress';
    }
    
    // Tier 2: Spend $5 to unlock bonus
    // CRITICAL: If user already used promo entries and balance is 0, treat as completed
    if (status.tier === 2 && !status.offerClaimed) {
      if (status.hasUsedPromoEntry && status.promoBalancePence === 0) {
        return 'completed';
      }
      return 'progress';
    }
    
    // Fully completed (claimed and used up, no more tiers)
    if (status.offerClaimed && status.promoBalancePence === 0) {
      // For tier 2, this means they're done
      if (status.tier === 2) {
        return 'completed';
      }
      // For tier 1, they might be transitioning to tier 2 (handled by DB)
      return 'completed';
    }
    
    return null;
  }, [status, isExpired]);

  // Can claim tier 2 when threshold is met
  const canClaimTier2 = useMemo(() => {
    if (!status || status.tier !== 2) return false;
    return status.totalSpentPence >= status.thresholdPence && !status.offerClaimed;
  }, [status]);

  return {
    status,
    loading: !!user?.id ? query.isLoading : false,
    error: query.error ? (query.error as Error).message : null,
    refetch: () => query.refetch(),
    progressPercent,
    daysRemaining,
    isExpired,
    displayState,
    canClaimTier2,
    justUnlockedTier2,
    markTier2UnlockSeen,
    shouldShowTier2OnLogin,
    markTier2LoginShown,
  };
}
