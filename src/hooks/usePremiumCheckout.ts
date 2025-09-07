import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';
import { toast } from 'sonner';

export const usePremiumCheckout = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated } = useAuthUser();

  const startPremiumCheckout = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Please sign in to upgrade to premium');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Starting premium checkout for user:', user.id);

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { user_id: user.id }
      });

      if (error) {
        console.error('Checkout error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (!data?.url) {
        throw new Error('No checkout URL received');
      }

      console.log('Checkout session created, redirecting to:', data.url);
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;

    } catch (error: any) {
      console.error('Premium checkout error:', error);
      toast.error(error.message || 'Failed to start checkout process');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    startPremiumCheckout,
    isLoading
  };
};