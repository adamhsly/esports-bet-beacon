
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/toast-provider';
import { PlayerCard } from '@/types/card';

export const useWelcomePack = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeCards, setWelcomeCards] = useState<PlayerCard[]>([]);
  const [packName, setPackName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const claimWelcomePack = async () => {
    if (!user || isProcessing) return;

    setIsProcessing(true);
    
    try {
      console.log('Claiming welcome pack for user:', user.id);
      
      const { data, error } = await supabase.functions.invoke('welcome-starter-pack', {
        body: { user_id: user.id }
      });

      if (error) {
        console.error('Error claiming welcome pack:', error);
        toast({
          title: "Welcome Pack Error",
          description: "Failed to claim your welcome pack. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        setWelcomeCards(data.cards || []);
        setPackName(data.pack_name || 'Welcome Pack');
        setShowWelcomeModal(true);
        
        toast({
          title: "Welcome Pack Received!",
          description: `You received ${data.cards_generated} cards to start your collection!`,
        });
      } else {
        console.error('Welcome pack response error:', data);
        if (data?.error === 'Welcome pack already claimed') {
          // User already has their welcome pack, no need to show error
          return;
        }
        
        toast({
          title: "Welcome Pack Error",
          description: data?.error || "Failed to claim welcome pack",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in claimWelcomePack:', error);
      toast({
        title: "Welcome Pack Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const checkWelcomePackStatus = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('welcome_pack_claimed')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking welcome pack status:', error);
        return;
      }

      // If user hasn't claimed their welcome pack, automatically claim it
      if (!profile?.welcome_pack_claimed) {
        console.log('User has not claimed welcome pack, auto-claiming...');
        await claimWelcomePack();
      }
    } catch (error) {
      console.error('Error in checkWelcomePackStatus:', error);
    }
  };

  useEffect(() => {
    if (user) {
      // Small delay to ensure user is fully authenticated
      const timer = setTimeout(() => {
        checkWelcomePackStatus();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user]);

  return {
    showWelcomeModal,
    setShowWelcomeModal,
    welcomeCards,
    packName,
    isProcessing,
    claimWelcomePack
  };
};
