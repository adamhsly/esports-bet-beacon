import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePaidRoundCheckout() {
  const [loading, setLoading] = useState(false);

  const initiateCheckout = async (roundId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-round-entry-checkout', {
        body: { round_id: roundId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
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
