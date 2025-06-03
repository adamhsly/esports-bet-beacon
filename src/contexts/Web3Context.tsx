
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WalletInfo {
  address: string;
  blockchain: string;
  walletType: string;
  isPrimary: boolean;
}

interface Web3ContextType {
  isConnected: boolean;
  currentWallet: WalletInfo | null;
  userWallets: WalletInfo[];
  connectWallet: (walletType: string) => Promise<boolean>;
  disconnectWallet: () => Promise<void>;
  switchWallet: (walletAddress: string) => Promise<void>;
  isLoading: boolean;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentWallet, setCurrentWallet] = useState<WalletInfo | null>(null);
  const [userWallets, setUserWallets] = useState<WalletInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load user's connected wallets on mount
  useEffect(() => {
    loadUserWallets();
  }, []);

  const loadUserWallets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: wallets, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });

      if (error) {
        console.error('Error loading wallets:', error);
        return;
      }

      const formattedWallets: WalletInfo[] = wallets.map(wallet => ({
        address: wallet.wallet_address,
        blockchain: wallet.blockchain,
        walletType: wallet.wallet_type,
        isPrimary: wallet.is_primary || false,
      }));

      setUserWallets(formattedWallets);
      
      // Set primary wallet as current if available
      const primaryWallet = formattedWallets.find(w => w.isPrimary);
      if (primaryWallet) {
        setCurrentWallet(primaryWallet);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error in loadUserWallets:', error);
    }
  };

  const connectWallet = async (walletType: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      let walletAddress = '';
      
      // Simulate wallet connection based on type
      switch (walletType) {
        case 'metamask':
          if (typeof window !== 'undefined' && window.ethereum) {
            const accounts = await window.ethereum.request({ 
              method: 'eth_requestAccounts' 
            });
            walletAddress = accounts[0];
          } else {
            toast({
              title: "MetaMask not found",
              description: "Please install MetaMask to continue",
              variant: "destructive"
            });
            return false;
          }
          break;
        case 'passport':
          // Immutable Passport integration would go here
          // For now, simulate connection
          walletAddress = '0x' + Math.random().toString(16).substr(2, 40);
          break;
        case 'wallet_connect':
          // WalletConnect integration would go here
          walletAddress = '0x' + Math.random().toString(16).substr(2, 40);
          break;
        default:
          throw new Error('Unsupported wallet type');
      }

      if (!walletAddress) {
        throw new Error('Failed to get wallet address');
      }

      // Save wallet to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if this is the user's first wallet (make it primary)
      const isPrimary = userWallets.length === 0;

      const { error } = await supabase
        .from('user_wallets')
        .upsert({
          user_id: user.id,
          wallet_address: walletAddress,
          blockchain: 'immutable',
          wallet_type: walletType,
          is_primary: isPrimary,
          last_used_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving wallet:', error);
        throw error;
      }

      const newWallet: WalletInfo = {
        address: walletAddress,
        blockchain: 'immutable',
        walletType,
        isPrimary,
      };

      setCurrentWallet(newWallet);
      setIsConnected(true);
      
      // Reload wallets to get updated list
      await loadUserWallets();

      toast({
        title: "Wallet Connected",
        description: `Successfully connected ${walletType} wallet`,
      });

      return true;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    setCurrentWallet(null);
    setIsConnected(false);
    
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  const switchWallet = async (walletAddress: string) => {
    const wallet = userWallets.find(w => w.address === walletAddress);
    if (wallet) {
      setCurrentWallet(wallet);
      
      // Update last_used_at in database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_wallets')
          .update({ last_used_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('wallet_address', walletAddress);
      }
    }
  };

  const value: Web3ContextType = {
    isConnected,
    currentWallet,
    userWallets,
    connectWallet,
    disconnectWallet,
    switchWallet,
    isLoading,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};
