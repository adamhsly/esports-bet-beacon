
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWalletConnection } from './useWalletConnection';

export const useCardMinting = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { walletAddress, isConnected } = useWalletConnection();
  const [isProcessing, setIsProcessing] = useState(false);

  const mintCards = async (cardIds: string[]) => {
    if (!user || !isConnected || !walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect a wallet before minting cards",
        variant: "destructive",
      });
      return false;
    }

    if (cardIds.length === 0) {
      toast({
        title: "No Cards Selected",
        description: "Please select cards to mint",
        variant: "destructive",
      });
      return false;
    }

    setIsProcessing(true);

    try {
      console.log('Minting cards:', cardIds);
      
      const { data, error } = await supabase.functions.invoke('mint-existing-cards', {
        body: { 
          user_id: user.id,
          card_ids: cardIds,
          wallet_address: walletAddress
        }
      });

      if (error) {
        console.error('Error minting cards:', error);
        toast({
          title: "Minting Failed",
          description: "Failed to initiate card minting. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      if (data?.success) {
        toast({
          title: "Minting Initiated",
          description: `${data.cards_queued} cards queued for minting. You'll be notified when complete.`,
        });
        return true;
      } else {
        console.error('Minting response error:', data);
        toast({
          title: "Minting Error",
          description: data?.error || "Failed to mint cards",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error in mintCards:', error);
      toast({
        title: "Minting Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const getMintingStatus = async () => {
    if (!user) return [];

    try {
      // TODO: Implement card_minting_requests table
      console.log('Minting status check - table not implemented yet');
      return [];
    } catch (error) {
      console.error('Error in getMintingStatus:', error);
      return [];
    }
  };

  return {
    mintCards,
    getMintingStatus,
    isProcessing,
    canMint: isConnected && !!walletAddress
  };
};
