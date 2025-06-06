
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWalletConnection } from './useWalletConnection';
import { PlayerCard } from '@/types/card';

export const useWelcomePack = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isConnected, walletAddress } = useWalletConnection();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeCards, setWelcomeCards] = useState<PlayerCard[]>([]);
  const [packName, setPackName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mintingInitiated, setMintingInitiated] = useState(false);

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
        setMintingInitiated(data.minting_initiated || false);
        setShowWelcomeModal(true);
        
        if (data.minting_initiated) {
          toast({
            title: "Welcome Pack Received!",
            description: `You received ${data.cards_generated} cards and NFT minting has been initiated!`,
          });
        } else {
          toast({
            title: "Welcome Pack Received!",
            description: `You received ${data.cards_generated} cards! Connect a wallet to mint them as NFTs.`,
          });
        }
      } else {
        console.error('Welcome pack response error:', data);
        if (data?.error === 'Welcome pack already claimed') {
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
    mintingInitiated,
    claimWelcomePack
  };
};
