import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePaidRoundCheckout() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const initiateCheckout = async (roundId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-round-entry-checkout', {
        body: { round_id: roundId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create checkout session');
      }

      // Promo-only flow (no Stripe) completes immediately on the backend.
      if (data?.promo_covered) {
        // Force-refresh the welcome offer balance everywhere.
        await queryClient.invalidateQueries({ queryKey: ['welcomeOffer'] });

        toast.success(`Entry completed! £${(data.promo_used / 100).toFixed(2)} promo balance used.`);
        navigate(`/fantasy?payment=success&round_id=${roundId}`);
        setLoading(false);
        return;
      }

      if (data?.url) {
        // Stripe flow - deduction happens later (on webhook/payment completion).
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err.message || 'Failed to start checkout');
      setLoading(false);
    }
  };

  return { initiateCheckout, loading };
}
