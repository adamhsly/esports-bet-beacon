
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useWeb3 } from '@/contexts/Web3Context';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Trophy, 
  Star, 
  Plus, 
  Zap, 
  Target, 
  Flame, 
  Crown, 
  Settings, 
  Upload,
  Lock,
  Gift,
  Medal,
  Coins,
  TrendingUp,
  Users,
  Award
} from 'lucide-react';
import PremiumConnector from './PremiumConnector';
import { useProfile } from '@/hooks/useProfile';

interface UserStats {
  totalCards: number;
  fantasyTeams: number;
  tournamentsEntered: number;
  totalSpent: number;
  currentLevel: number;
  currentXP: number;
  xpToNext: number;
  globalRank: number;
  highestRank: number;
  currentStreak: number;
  hasPremiumPass: boolean;
}

interface RecentTeamCard {
  id: string;
  roundName: string;
  rank: number;
  score: number;
  teamName: string;
}

interface CollectionItem {
  id: string;
  name: string;
  type: 'frame' | 'border' | 'badge' | 'title';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  imageUrl?: string;
}

const Web3UserProfile: React.FC = () => {
  const { isConnected, currentWallet, userWallets } = useWeb3();
  const { profile } = useProfile();
  const [userStats, setUserStats] = useState<UserStats>({
    totalCards: 0,
    fantasyTeams: 0,
    tournamentsEntered: 0,
    totalSpent: 0,
    currentLevel: 12,
    currentXP: 2840,
    xpToNext: 660,
    globalRank: 1247,
    highestRank: 89,
    currentStreak: 7,
    hasPremiumPass: false,
  });
  const [recentTeams, setRecentTeams] = useState<RecentTeamCard[]>([
    { id: '1', roundName: 'Weekly Round #12', rank: 145, score: 2840, teamName: 'Lightning Bolts' },
    { id: '2', roundName: 'Daily Round #89', rank: 23, score: 3200, teamName: 'Neon Guardians' },
    { id: '3', roundName: 'Monthly Round #3', rank: 512, score: 1890, teamName: 'Cyber Strikers' },
    { id: '4', roundName: 'Weekly Round #11', rank: 78, score: 2645, teamName: 'Thunder Hawks' },
    { id: '5', roundName: 'Daily Round #88', rank: 234, score: 2156, teamName: 'Plasma Wolves' },
  ]);
  const [collections, setCollections] = useState<CollectionItem[]>([
    { id: '1', name: 'Champion Frame', type: 'frame', rarity: 'legendary', unlocked: true },
    { id: '2', name: 'Neon Border', type: 'border', rarity: 'epic', unlocked: true },
    { id: '3', name: 'Pro Badge', type: 'badge', rarity: 'rare', unlocked: false },
    { id: '4', name: 'Master Title', type: 'title', rarity: 'legendary', unlocked: false },
  ]);
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

      // Get fantasy round picks count
      const { count: teamsCount } = await supabase
        .from('fantasy_round_picks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get pack purchases total
      // TODO: Implement pack_purchases table
      const totalSpent = 0;

      setUserStats(prev => ({
        ...prev,
        totalCards: cardCount || 0,
        fantasyTeams: teamsCount || 0,
        totalSpent,
      }));
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-neon-gold';
      case 'epic': return 'text-neon-purple';
      case 'rare': return 'text-neon-blue';
      default: return 'text-muted-foreground';
    }
  };

  const xpProgress = ((userStats.currentXP / (userStats.currentXP + userStats.xpToNext)) * 100);

  // Load default stats for non-connected users
  useEffect(() => {
    if (!isConnected) {
      setIsLoading(false);
    }
  }, [isConnected]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-engagement-bg-start to-engagement-bg-end">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 to-neon-blue/10 animate-neon-pulse"></div>
          <CardContent className="relative z-10 p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-neon-purple to-neon-blue rounded-full flex items-center justify-center text-3xl font-gaming text-white animate-premium-glow">
                  {isConnected ? currentWallet?.address.slice(0, 2).toUpperCase() : <User className="w-10 h-10" />}
                </div>
                <Button size="sm" variant="outline" className="absolute -bottom-2 -right-2 rounded-full p-2 bg-engagement-card border-neon-blue">
                  <Upload className="w-3 h-3" />
                </Button>
              </div>
              
              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                  <h1 className="text-3xl font-gaming text-white">Cyber Champion</h1>
                  <Badge className="bg-gradient-to-r from-neon-purple to-neon-blue text-white border-none animate-neon-pulse">
                    <Star className="w-3 h-3 mr-1" />
                    Level {userStats.currentLevel}
                  </Badge>
                </div>
                <p className="text-neon-blue font-gaming mb-4">Master of the Virtual Arena</p>
                
                {/* XP Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-white font-gaming">
                    <span>Level {userStats.currentLevel}</span>
                    <span>{userStats.currentXP} / {userStats.currentXP + userStats.xpToNext} XP</span>
                  </div>
                  <Progress 
                    value={xpProgress} 
                    className="h-3 bg-engagement-bg-start [&>div]:bg-gradient-to-r [&>div]:from-neon-blue [&>div]:to-neon-purple [&>div]:animate-neon-pulse [&>div]:shadow-lg [&>div]:shadow-neon-blue/50"
                  />
                  <p className="text-xs text-neon-blue/80 font-gaming">{userStats.xpToNext} XP to next level</p>
                </div>
              </div>

              {/* Streak & Premium */}
              <div className="flex flex-col gap-3">
                <Badge className="bg-neon-orange/20 text-neon-orange border-neon-orange/30 animate-streak-fire font-gaming">
                  <Flame className="w-4 h-4 mr-2" />
                  {userStats.currentStreak} Day Streak
                </Badge>
                {profile?.premium_pass ? (
                  <Badge className="bg-neon-gold/20 text-neon-gold border-neon-gold/30 animate-premium-glow font-gaming">
                    <Crown className="w-4 h-4 mr-2" />
                    Premium Active
                  </Badge>
                ) : (
                  <PremiumConnector size="sm" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Fantasy Performance */}
            <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-gaming">
                  <Trophy className="w-5 h-5 text-neon-purple" />
                  Fantasy Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-neon-purple/10 rounded-lg border border-neon-purple/20">
                    <Medal className="w-8 h-8 text-neon-purple mx-auto mb-2" />
                    <p className="text-3xl font-gaming text-neon-purple">#{userStats.highestRank}</p>
                    <p className="text-sm text-white font-gaming">Highest Rank</p>
                  </div>
                  <div className="text-center p-4 bg-neon-blue/10 rounded-lg border border-neon-blue/20">
                    <TrendingUp className="w-8 h-8 text-neon-blue mx-auto mb-2" />
                    <p className="text-3xl font-gaming text-neon-blue">#{userStats.globalRank}</p>
                    <p className="text-sm text-white font-gaming">Global Rank</p>
                  </div>
                  <div className="text-center p-4 bg-neon-green/10 rounded-lg border border-neon-green/20">
                    <Users className="w-8 h-8 text-neon-green mx-auto mb-2" />
                    <p className="text-3xl font-gaming text-neon-green">{userStats.fantasyTeams}</p>
                    <p className="text-sm text-white font-gaming">Teams Created</p>
                  </div>
                </div>

                {/* Recent Teams */}
                <div>
                  <h3 className="text-lg font-gaming text-white mb-6 flex items-center gap-2">
                    <Target className="w-4 h-4 text-neon-green" />
                    Recent Fantasy Teams
                  </h3>
                  {/* Mobile: Single column, Desktop: 3+2 layout with larger cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 lg:gap-6">
                    {recentTeams.slice(0, 3).map((team) => (
                      <Card key={team.id} className="bg-gradient-to-br from-engagement-bg-start to-engagement-card border-engagement-border hover:border-neon-purple/50 transition-all duration-300 hover:shadow-lg hover:shadow-neon-purple/20 lg:h-48">
                        <CardContent className="p-4 lg:p-6 h-full flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <Badge className={`${team.rank <= 50 ? 'bg-neon-gold/20 text-neon-gold border-neon-gold/30' : team.rank <= 200 ? 'bg-neon-purple/20 text-neon-purple border-neon-purple/30' : 'bg-muted/20 text-muted-foreground border-muted/30'} font-gaming text-xs lg:text-sm`}>
                                #{team.rank}
                              </Badge>
                              <Trophy className="w-4 h-4 lg:w-5 lg:h-5 text-neon-gold" />
                            </div>
                            <h4 className="font-gaming text-white text-base lg:text-lg mb-2 line-clamp-2">{team.teamName}</h4>
                            <p className="text-sm lg:text-base text-muted-foreground mb-3">{team.roundName}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-left">
                              <p className="text-xs lg:text-sm text-muted-foreground">Score</p>
                              <p className="text-lg lg:text-xl text-neon-blue font-gaming font-bold">{team.score}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs lg:text-sm text-muted-foreground">Rank</p>
                              <p className="text-lg lg:text-xl text-neon-green font-gaming font-bold">#{team.rank}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {/* Second row for desktop (2 cards) */}
                  {recentTeams.length > 3 && (
                    <div className="hidden lg:grid grid-cols-2 gap-6 mt-6">
                      {recentTeams.slice(3, 5).map((team) => (
                        <Card key={team.id} className="bg-gradient-to-br from-engagement-bg-start to-engagement-card border-engagement-border hover:border-neon-purple/50 transition-all duration-300 hover:shadow-lg hover:shadow-neon-purple/20 h-48">
                          <CardContent className="p-6 h-full flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <Badge className={`${team.rank <= 50 ? 'bg-neon-gold/20 text-neon-gold border-neon-gold/30' : team.rank <= 200 ? 'bg-neon-purple/20 text-neon-purple border-neon-purple/30' : 'bg-muted/20 text-muted-foreground border-muted/30'} font-gaming`}>
                                  #{team.rank}
                                </Badge>
                                <Trophy className="w-5 h-5 text-neon-gold" />
                              </div>
                              <h4 className="font-gaming text-white text-lg mb-2 line-clamp-2">{team.teamName}</h4>
                              <p className="text-base text-muted-foreground mb-3">{team.roundName}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-left">
                                <p className="text-sm text-muted-foreground">Score</p>
                                <p className="text-xl text-neon-blue font-gaming font-bold">{team.score}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Rank</p>
                                <p className="text-xl text-neon-green font-gaming font-bold">#{team.rank}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  {/* Mobile: Show remaining teams in simple list */}
                  {recentTeams.length > 3 && (
                    <div className="lg:hidden space-y-3 mt-4">
                      {recentTeams.slice(3).map((team) => (
                        <div key={team.id} className="flex items-center justify-between p-3 bg-engagement-bg-start rounded-lg border border-engagement-border">
                          <div>
                            <p className="font-gaming text-white">{team.teamName}</p>
                            <p className="text-sm text-muted-foreground">{team.roundName}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={`${team.rank <= 50 ? 'bg-neon-gold/20 text-neon-gold border-neon-gold/30' : team.rank <= 200 ? 'bg-neon-purple/20 text-neon-purple border-neon-purple/30' : 'bg-muted/20 text-muted-foreground border-muted/30'} font-gaming`}>
                              #{team.rank}
                            </Badge>
                            <p className="text-sm text-neon-blue font-gaming mt-1">{team.score} pts</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Season Pass Track */}
            <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-gaming">
                  <Gift className="w-5 h-5 text-neon-blue" />
                  Season Pass Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Free Track */}
                  <div className="p-4 bg-neon-blue/10 rounded-lg border border-neon-blue/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-neon-blue" />
                        <span className="font-gaming text-white">Free Rewards</span>
                      </div>
                      <Badge className="bg-neon-blue/20 text-neon-blue border-neon-blue/30 font-gaming">Tier 5</Badge>
                    </div>
                    <p className="text-sm text-neon-blue/80 font-gaming">Next: Team Boost Pack</p>
                    <Progress value={45} className="h-2 mt-2 bg-engagement-bg-start [&>div]:bg-neon-blue" />
                  </div>

                  {/* Premium Track */}
                  <div className={`p-4 rounded-lg border ${profile?.premium_pass ? 'bg-neon-gold/10 border-neon-gold/20 animate-premium-glow' : 'bg-muted/10 border-muted/20'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {profile?.premium_pass ? (
                          <Crown className="w-4 h-4 text-neon-gold" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className={`font-gaming ${profile?.premium_pass ? 'text-neon-gold' : 'text-muted-foreground'}`}>
                          Premium Rewards
                        </span>
                      </div>
                      <Badge className={`${profile?.premium_pass ? 'bg-neon-gold/20 text-neon-gold border-neon-gold/30' : 'bg-muted/20 text-muted-foreground border-muted/30'} font-gaming`}>
                        Tier 5
                      </Badge>
                    </div>
                    <p className={`text-sm font-gaming ${profile?.premium_pass ? 'text-neon-gold/80' : 'text-muted-foreground'}`}>
                      Next: Legendary Card Pack
                    </p>
                    <Progress 
                      value={45} 
                      className={`h-2 mt-2 bg-engagement-bg-start ${profile?.premium_pass ? '[&>div]:bg-neon-gold' : '[&>div]:bg-muted'}`} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Statistics */}
            <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-gaming">
                  <Award className="w-5 h-5 text-neon-green" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground font-gaming">Loading statistics...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-engagement-bg-start rounded-lg">
                      <span className="text-white font-gaming">Total Cards</span>
                      <span className="text-neon-purple font-gaming font-bold">{userStats.totalCards}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-engagement-bg-start rounded-lg">
                      <span className="text-white font-gaming">Tournaments</span>
                      <span className="text-neon-orange font-gaming font-bold">{userStats.tournamentsEntered}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-engagement-bg-start rounded-lg">
                      <span className="text-white font-gaming">Total Spent</span>
                      <span className="text-neon-blue font-gaming font-bold">${userStats.totalSpent}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Collections */}
            <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-gaming">
                  <Coins className="w-5 h-5 text-neon-gold" />
                  Collections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {collections.map((item) => (
                    <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${item.unlocked ? 'bg-engagement-bg-start border-engagement-border' : 'bg-muted/10 border-muted/20'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded border-2 flex items-center justify-center ${item.unlocked ? `border-current ${getRarityColor(item.rarity)}` : 'border-muted-foreground'}`}>
                          {item.unlocked ? (
                            <Star className="w-4 h-4" />
                          ) : (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className={`font-gaming text-sm ${item.unlocked ? getRarityColor(item.rarity) : 'text-muted-foreground'}`}>
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                        </div>
                      </div>
                      {!item.unlocked && (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Premium Upgrade */}
            {!profile?.premium_pass && (
              <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white font-gaming">
                    <Crown className="w-5 h-5 text-neon-gold" />
                    Premium Upgrade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-neon-gold/20 rounded-full flex items-center justify-center mx-auto animate-premium-glow">
                      <Crown className="w-8 h-8 text-neon-gold" />
                    </div>
                    <div>
                      <p className="text-white font-gaming mb-2">Unlock Premium</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Get access to exclusive rewards, advanced features, and premium support
                      </p>
                    </div>
                    <PremiumConnector className="w-full" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-gaming">
                  <Zap className="w-5 h-5 text-neon-green" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full bg-gradient-to-r from-neon-purple to-neon-blue hover:from-neon-purple/80 hover:to-neon-blue/80 text-white font-gaming">
                    <Plus className="w-4 h-4 mr-2" />
                    Buy Card Packs
                  </Button>
                  <Button variant="outline" className="w-full border-neon-green text-neon-green hover:bg-neon-green/10 font-gaming">
                    <Trophy className="w-4 h-4 mr-2" />
                    Create Fantasy Team
                  </Button>
                  <Button variant="outline" className="w-full border-neon-orange text-neon-orange hover:bg-neon-orange/10 font-gaming">
                    <Settings className="w-4 h-4 mr-2" />
                    Profile Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Web3UserProfile;
