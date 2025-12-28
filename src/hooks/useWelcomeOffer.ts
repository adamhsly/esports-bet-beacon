import { useMemo, useEffect, useRef } from 'react';
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

  return {
    tier: result?.tier ?? 1,
    totalSpentPence: result?.total_spent_pence ?? 0,
    thresholdPence: result?.threshold_pence ?? 0,
    offerClaimed,
    promoBalancePence,
    promoExpiresAt,
    rewardPence: result?.reward_pence ?? 1000,
    tier1Complete: result?.tier1_complete ?? false,
  };
}

export function useWelcomeOffer() {
  const { user } = useAuth();
  const previousTierRef = useRef<number | null>(null);

  const query = useQuery({
    queryKey: ['welcomeOffer', user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchWelcomeOfferStatus(user!.id),
  });

  const status = query.data ?? null;

  // Detect when user just unlocked tier 2 (transitions from tier 1 to tier 2)
  const justUnlockedTier2 = useMemo(() => {
    if (!user?.id || !status) return false;
    
    // Check if we've stored that this user has already seen the tier 2 unlock popup
    const tier2UnlockSeenKey = `tier2UnlockSeen_${user.id}`;
    const tier2UnlockSeen = localStorage.getItem(tier2UnlockSeenKey) === 'true';
    
    // If tier 2 and not yet seen the unlock popup
    if (status.tier === 2 && !tier2UnlockSeen) {
      return true;
    }
    
    return false;
  }, [status, user?.id]);

  // Track when tier 2 popup is shown
  const markTier2UnlockSeen = () => {
    if (user?.id) {
      localStorage.setItem(`tier2UnlockSeen_${user.id}`, 'true');
    }
  };

  // Check if we should show tier 2 popup on login (2nd time)
  const shouldShowTier2OnLogin = useMemo(() => {
    if (!user?.id || !status || status.tier !== 2) return false;
    
    // Only show if tier 2 unlock was seen but this is a new session
    const tier2UnlockSeenKey = `tier2UnlockSeen_${user.id}`;
    const tier2LoginShownKey = `tier2LoginShown_${user.id}`;
    const tier2SessionKey = `tier2ShownThisSession_${user.id}`;
    
    const tier2UnlockSeen = localStorage.getItem(tier2UnlockSeenKey) === 'true';
    const tier2LoginShown = localStorage.getItem(tier2LoginShownKey) === 'true';
    const shownThisSession = sessionStorage.getItem(tier2SessionKey) === 'true';
    
    // Show if: unlock was seen, haven't shown on login yet, and not shown this session
    return tier2UnlockSeen && !tier2LoginShown && !shownThisSession;
  }, [status, user?.id]);

  // Mark tier 2 login popup as shown
  const markTier2LoginShown = () => {
    if (user?.id) {
      localStorage.setItem(`tier2LoginShown_${user.id}`, 'true');
      sessionStorage.setItem(`tier2ShownThisSession_${user.id}`, 'true');
    }
  };

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
    
    // Tier 1: Free bonus not yet claimed
    if (status.tier === 1 && !status.offerClaimed) {
      return 'progress';
    }
    
    // Tier 2: Spend $5 to unlock bonus
    if (status.tier === 2 && !status.offerClaimed) {
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
