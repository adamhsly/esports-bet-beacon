 import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/currencyUtils';
 import { trackPurchase } from '@/utils/metaPixel';

 export interface TeamPickData {
  id: string;
  name: string;
  type: string;
  logo_url?: string;
}

interface CheckoutOptions {
  teamPicks?: TeamPickData[];
  benchTeam?: { id: string; name: string; type: string } | null;
  starTeamId?: string | null;
   paymentMethod?: 'stripe' | 'crypto';
}

export function usePaidRoundCheckout() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

   const initiateCheckout = async (roundId: string, options?: CheckoutOptions) => {
    setLoading(true);
    try {
       const functionName = options?.paymentMethod === 'crypto' 
         ? 'create-crypto-checkout' 
         : 'create-round-entry-checkout';
 
       const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          round_id: roundId,
          team_picks: options?.teamPicks,
          bench_team: options?.benchTeam,
          star_team_id: options?.starTeamId,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create checkout session');
      }

      // Promo-only flow (no Stripe) completes immediately on the backend.
      if (data?.promo_covered) {
        // Force-refresh the welcome offer balance everywhere.
        await queryClient.invalidateQueries({ queryKey: ['welcomeOffer'] });

        // Track Purchase for promo-covered paid entry
        trackPurchase(roundId, undefined, data.promo_used, 'promo');

        toast.success(`Entry completed! ${formatCurrency(data.promo_used)} promo balance used.`);
        // Return success so caller can show success modal instead of navigating away
        setLoading(false);
        return { success: true, promoCovered: true, promoUsed: data.promo_used };
      }

      if (data?.url) {
         // Payment flow - redirect to provider (Stripe or Coinbase)
        window.location.href = data.url;
        return { success: true, redirecting: true };
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err.message || 'Failed to start checkout');
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

   return { initiateCheckout, loading };
}
