
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWeb3 } from '@/contexts/Web3Context';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, Trophy, Star, Plus } from 'lucide-react';

interface UserStats {
  totalCards: number;
  fantasyTeams: number;
  tournamentsEntered: number;
  totalSpent: number;
}

const Web3UserProfile: React.FC = () => {
  const { isConnected, currentWallet, userWallets } = useWeb3();
  const [userStats, setUserStats] = useState<UserStats>({
    totalCards: 0,
    fantasyTeams: 0,
    tournamentsEntered: 0,
    totalSpent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isConnected) {
      loadUserStats();
    }
  }, [isConnected]);

  const loadUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's card collection count
      const { count: cardCount } = await supabase
        .from('user_card_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get fantasy teams count
      const { count: teamsCount } = await supabase
        .from('fantasy_teams')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get pack purchases total
      const { data: purchases } = await supabase
        .from('pack_purchases')
        .select('pack_price')
        .eq('user_id', user.id);

      const totalSpent = purchases?.reduce((sum, purchase) => sum + purchase.pack_price, 0) || 0;

      setUserStats({
        totalCards: cardCount || 0,
        fantasyTeams: teamsCount || 0,
        tournamentsEntered: 0, // TODO: Calculate from tournament entries
        totalSpent,
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet size={20} />
            Web3 Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Connect your wallet to view your web3 profile
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet size={20} />
            Connected Wallets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userWallets.map((wallet) => (
              <div
                key={wallet.address}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  currentWallet?.address === wallet.address 
                    ? 'bg-theme-purple/10 border-theme-purple' 
                    : 'bg-muted/50'
                }`}
              >
                <div>
                  <p className="font-mono text-sm">{formatAddress(wallet.address)}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {wallet.walletType} • {wallet.blockchain}
                  </p>
                </div>
                <div className="flex gap-2">
                  {wallet.isPrimary && (
                    <Badge variant="default" className="text-xs">Primary</Badge>
                  )}
                  {currentWallet?.address === wallet.address && (
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy size={20} />
            Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading statistics...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-theme-purple">{userStats.totalCards}</p>
                <p className="text-xs text-muted-foreground">Total Cards</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-theme-green">{userStats.fantasyTeams}</p>
                <p className="text-xs text-muted-foreground">Fantasy Teams</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-orange-400">{userStats.tournamentsEntered}</p>
                <p className="text-xs text-muted-foreground">Tournaments</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-blue-400">${userStats.totalSpent}</p>
                <p className="text-xs text-muted-foreground">Total Spent</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star size={20} />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Plus size={20} />
              <span className="text-sm">Buy Packs</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Trophy size={20} />
              <span className="text-sm">Create Team</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Wallet size={20} />
              <span className="text-sm">Trade Cards</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Web3UserProfile;
