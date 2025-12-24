import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface WelcomeOfferStatus {
  totalSpentPence: number;
  thresholdPence: number;
  offerClaimed: boolean;
  promoBalancePence: number;
  promoExpiresAt: string | null;
  rewardPence: number;
}

async function fetchWelcomeOfferStatus(userId: string): Promise<WelcomeOfferStatus> {
  const { data, error: rpcError } = await supabase.rpc('get_welcome_offer_status', { p_user_id: userId });

  if (rpcError) {
    console.error('Error fetching welcome offer status:', rpcError);
    throw new Error(rpcError.message);
  }

  const result = data as
    | {
        total_spent_pence?: number;
        threshold_pence?: number;
        offer_claimed?: boolean;
        promo_balance_pence?: number;
        promo_expires_at?: string;
        reward_pence?: number;
      }
    | null;

  // Prefer profile values when available.
  // claim_welcome_bonus updates public.profiles (welcome_offer_claimed / promo_balance_pence).
  // get_welcome_offer_status historically read user_promo_balance/user_welcome_spending.
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
    totalSpentPence: result?.total_spent_pence ?? 0,
    thresholdPence: result?.threshold_pence ?? 500,
    offerClaimed,
    promoBalancePence,
    promoExpiresAt,
    rewardPence: result?.reward_pence ?? 1000,
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

  const progressPercent = useMemo(() => {
    return status ? Math.min(100, Math.round((status.totalSpentPence / status.thresholdPence) * 100)) : 0;
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

  const displayState: 'progress' | 'active' | 'expired' | 'completed' | null =
    !status
      ? null
      : status.promoBalancePence > 0 && !isExpired
        ? 'active'
        : status.promoBalancePence > 0 && isExpired
          ? 'expired'
          : status.offerClaimed && status.promoBalancePence === 0
            ? 'completed'
            : 'progress';

  return {
    status,
    loading: !!user?.id ? query.isLoading : false,
    error: query.error ? (query.error as Error).message : null,
    refetch: () => query.refetch(),
    progressPercent,
    daysRemaining,
    isExpired,
    displayState,
  };
}
