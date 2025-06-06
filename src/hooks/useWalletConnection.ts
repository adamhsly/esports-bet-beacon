
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface WalletInfo {
  isConnected: boolean;
  walletAddress: string | null;
  walletType: string | null;
}

export const useWalletConnection = () => {
  const { user } = useAuth();
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    isConnected: false,
    walletAddress: null,
    walletType: null
  });
  const [loading, setLoading] = useState(true);

  const checkWalletConnection = async () => {
    if (!user) {
      setWalletInfo({ isConnected: false, walletAddress: null, walletType: null });
      setLoading(false);
      return;
    }

    try {
      const { data: wallet, error } = await supabase
        .from('user_wallets')
        .select('wallet_address, wallet_type')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking wallet connection:', error);
      }

      setWalletInfo({
        isConnected: !!wallet,
        walletAddress: wallet?.wallet_address || null,
        walletType: wallet?.wallet_type || null
      });
    } catch (error) {
      console.error('Error in checkWalletConnection:', error);
      setWalletInfo({ isConnected: false, walletAddress: null, walletType: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkWalletConnection();
  }, [user]);

  return {
    ...walletInfo,
    loading,
    refreshWalletInfo: checkWalletConnection
  };
};
