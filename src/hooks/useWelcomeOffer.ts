import { useState, useEffect } from 'react';
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

export function useWelcomeOffer() {
  const { user } = useAuth();
  const [status, setStatus] = useState<WelcomeOfferStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!user) {
      setStatus(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: rpcError } = await supabase
        .rpc('get_welcome_offer_status', { p_user_id: user.id });

      if (rpcError) {
        console.error('Error fetching welcome offer status:', rpcError);
        setError(rpcError.message);
        setStatus(null);
      } else {
        // Type assertion for the JSON response
        const result = data as {
          total_spent_pence?: number;
          threshold_pence?: number;
          offer_claimed?: boolean;
          promo_balance_pence?: number;
          promo_expires_at?: string;
          reward_pence?: number;
        } | null;
        
        setStatus({
          totalSpentPence: result?.total_spent_pence || 0,
          thresholdPence: result?.threshold_pence || 500,
          offerClaimed: result?.offer_claimed || false,
          promoBalancePence: result?.promo_balance_pence || 0,
          promoExpiresAt: result?.promo_expires_at || null,
          rewardPence: result?.reward_pence || 1000,
        });
        setError(null);
      }
    } catch (err) {
      console.error('Error in useWelcomeOffer:', err);
      setError('Failed to fetch welcome offer status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [user?.id]);

  // Calculate progress percentage (0-100)
  const progressPercent = status 
    ? Math.min(100, Math.round((status.totalSpentPence / status.thresholdPence) * 100))
    : 0;

  // Calculate days remaining until promo expires
  const daysRemaining = status?.promoExpiresAt
    ? Math.max(0, Math.ceil((new Date(status.promoExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Check if promo is expired
  const isExpired = status?.promoExpiresAt 
    ? new Date(status.promoExpiresAt).getTime() < Date.now()
    : false;

  // Determine display state
  const displayState: 'progress' | 'active' | 'expired' | 'completed' | null = 
    !status ? null :
    status.promoBalancePence > 0 && !isExpired ? 'active' :
    status.promoBalancePence > 0 && isExpired ? 'expired' :
    status.offerClaimed && status.promoBalancePence === 0 ? 'completed' :
    'progress';

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
    progressPercent,
    daysRemaining,
    isExpired,
    displayState,
  };
}