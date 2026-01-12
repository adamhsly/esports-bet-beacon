import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Trophy, Info } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRewardsTrack } from '@/hooks/useRewardsTrack';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Timeframe = 'daily' | 'weekly' | 'lifetime';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  avatar_frame_id: string | null;
  avatar_border_id: string | null;
  total_points: number;
  rounds_played: number;
  rank: number;
  is_current_user: boolean;
}

const GlobalLeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const { free, premium } = useRewardsTrack();
  const [timeframe, setTimeframe] = useState<Timeframe>('lifetime');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_global_leaderboard', {
        p_timeframe: timeframe,
        p_limit: 100
      });

      if (error) throw error;

      const entries: LeaderboardEntry[] = (data || []).map((row: any) => ({
        user_id: row.user_id,
        username: row.username || 'Anonymous',
        avatar_url: row.avatar_url,
        avatar_frame_id: row.avatar_frame_id,
        avatar_border_id: row.avatar_border_id,
        total_points: Number(row.total_points),
        rounds_played: Number(row.rounds_played),
        rank: Number(row.rank),
        is_current_user: user?.id === row.user_id
      }));

      setLeaderboard(entries);

      // Find current user's entry
      const currentUserEntry = entries.find(e => e.is_current_user);
      setUserEntry(currentUserEntry || null);
    } catch (error) {
      console.error('Error fetching global leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [timeframe, user?.id]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return rank.toString();
    }
  };

  const getRowHighlight = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser && rank > 3) {
      return 'border-2 border-green-500/80 bg-green-500/10';
    }
    
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-500/40';
      case 2:
        return 'bg-gradient-to-r from-gray-400/30 to-gray-500/30 border border-gray-400/40';
      case 3:
        return 'bg-gradient-to-r from-orange-400/30 to-orange-500/30 border border-orange-500/40';
      default:
        return 'bg-card/50 hover:bg-card/80 border border-transparent';
    }
  };

  const timeframes: { key: Timeframe; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'lifetime', label: 'Lifetime' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-theme-gray-dark">
      <Helmet>
        <title>Global Leaderboard | Frags & Fortunes - Fantasy Esports Rankings</title>
        <meta name="description" content="See how you rank against all players on Frags & Fortunes. Compete in daily, weekly, and lifetime leaderboards based on your fantasy esports performance." />
        <link rel="canonical" href="https://fragsandfortunes.com/leaderboard" />
      </Helmet>
      <SearchableNavbar />

      <main className="flex-grow container mx-auto px-4 py-8 max-w-3xl">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Global Leaderboard</h1>
          <p className="text-muted-foreground">
            Compete across all rounds and climb the ranks
          </p>
        </div>

        {/* Scoring Info */}
        <div className="mb-6 flex justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors">
                  <Info className="w-4 h-4" />
                  How points are earned
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-4 bg-card border border-border">
                <p className="font-medium text-white mb-2">Scoring System</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>🏆 Top 1% = <span className="text-white font-medium">100 pts</span></li>
                  <li>🥇 Top 5% = <span className="text-white font-medium">70 pts</span></li>
                  <li>🥈 Top 10% = <span className="text-white font-medium">50 pts</span></li>
                  <li>🥉 Top 25% = <span className="text-white font-medium">30 pts</span></li>
                  <li>✅ Participation = <span className="text-white font-medium">10 pts</span></li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Timeframe Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {timeframes.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeframe(key)}
              className={`py-2.5 px-6 rounded-lg font-medium transition-all duration-200 ${
                timeframe === key
                  ? 'bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] text-white shadow-[0_0_12px_rgba(122,92,255,0.4)]'
                  : 'bg-white/[0.04] text-[#d1d1d9] border border-white/[0.05] hover:bg-[#7a5cff]/15 hover:border-[#7a5cff]/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="space-y-2">
          {loading ? (
            // Loading skeleton
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 py-3 px-4 bg-card/50 rounded-lg">
                  <div className="w-8 h-6 bg-muted rounded" />
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="w-32 h-4 bg-muted rounded" />
                  </div>
                  <div className="w-16 h-4 bg-muted rounded" />
                  <div className="w-12 h-4 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No rankings yet for this timeframe</p>
              <p className="text-sm mt-2">Complete rounds to earn points and climb the leaderboard!</p>
            </div>
          ) : (
            <>
              {/* Header Row */}
              <div className="flex items-center gap-4 py-2 px-4 text-xs text-muted-foreground uppercase tracking-wider">
                <div className="w-8 text-center">Rank</div>
                <div className="w-10" />
                <div className="flex-1">Player</div>
                <div className="w-20 text-right">Points</div>
                <div className="w-16 text-right">Rounds</div>
              </div>

              {/* Leaderboard Rows */}
              {leaderboard.map((entry) => (
                <LeaderboardRow
                  key={entry.user_id}
                  entry={entry}
                  free={free}
                  premium={premium}
                  getRankDisplay={getRankDisplay}
                  getRowHighlight={getRowHighlight}
                />
              ))}

              {/* Current User Section (if not in top 100) */}
              {user && !userEntry && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-center text-sm text-muted-foreground mb-4">Your position</p>
                  <div className="flex items-center gap-4 py-3 px-4 rounded-lg border-2 border-green-500/80 bg-green-500/10">
                    <div className="w-8 text-center text-sm font-medium text-white">—</div>
                    <EnhancedAvatar
                      src={null}
                      fallback="You"
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">You</p>
                    </div>
                    <div className="w-20 text-right">
                      <span className="text-sm font-bold text-white">0</span>
                      <span className="text-xs text-muted-foreground ml-1">pts</span>
                    </div>
                    <div className="w-16 text-right text-sm text-muted-foreground">0</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

// Leaderboard Row Component
const LeaderboardRow: React.FC<{
  entry: LeaderboardEntry;
  free: any[];
  premium: any[];
  getRankDisplay: (rank: number) => string;
  getRowHighlight: (rank: number, isCurrentUser: boolean) => string;
}> = ({ entry, free, premium, getRankDisplay, getRowHighlight }) => {
  const frameAsset = useMemo(() => {
    if (!entry.avatar_frame_id) return null;
    const frameReward = [...free, ...premium].find(
      item => item.id === entry.avatar_frame_id && item.type === 'frame'
    );
    return frameReward?.assetUrl || null;
  }, [entry.avatar_frame_id, free, premium]);

  const borderAsset = useMemo(() => {
    if (!entry.avatar_border_id) return null;
    const borderReward = [...free, ...premium].find(
      item => item.id === entry.avatar_border_id && 
      item.value && 
      (item.value.toLowerCase().includes('border') || item.value.toLowerCase().includes('pulse'))
    );
    return borderReward?.assetUrl || null;
  }, [entry.avatar_border_id, free, premium]);

  return (
    <div
      className={`flex items-center gap-4 py-3 px-4 rounded-lg transition-all ${getRowHighlight(entry.rank, entry.is_current_user)}`}
    >
      {/* Rank */}
      <div className="w-8 text-center">
        <span className={`text-sm font-bold ${entry.rank <= 3 ? 'text-xl' : 'text-white'}`}>
          {getRankDisplay(entry.rank)}
        </span>
      </div>

      {/* Avatar */}
      <EnhancedAvatar
        src={entry.avatar_url}
        fallback={entry.username.slice(0, 2).toUpperCase()}
        frameUrl={frameAsset}
        borderUrl={borderAsset}
        size="md"
      />

      {/* Username */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">
          {entry.username}
          {entry.is_current_user && (
            <span className="ml-2 text-xs text-green-400">(You)</span>
          )}
        </p>
      </div>

      {/* Points */}
      <div className="w-20 text-right">
        <span className="text-sm font-bold text-white">{entry.total_points.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground ml-1">pts</span>
      </div>

      {/* Rounds Played */}
      <div className="w-16 text-right text-sm text-muted-foreground">
        {entry.rounds_played}
      </div>
    </div>
  );
};

export default GlobalLeaderboardPage;
