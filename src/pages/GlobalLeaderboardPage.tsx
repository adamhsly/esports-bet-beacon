import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Trophy, Info } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRewardsTrack } from '@/hooks/useRewardsTrack';
import { PositionChangeIndicator } from '@/components/ui/position-change-indicator';
import { LeaderboardPodium } from '@/components/leaderboard/LeaderboardPodium';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Timeframe = 'weekly' | 'lifetime';

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
  position_change?: number | null;
}

const GlobalLeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const { free, premium } = useRewardsTrack();
  const [timeframe, setTimeframe] = useState<Timeframe>('lifetime');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_global_leaderboard', {
        p_timeframe: timeframe,
        p_limit: 100
      });

      if (error) throw error;

      const allEntries: LeaderboardEntry[] = (data || []).map((row: any) => ({
        user_id: row.user_id,
        username: row.username || 'Anonymous',
        avatar_url: row.avatar_url,
        avatar_frame_id: row.avatar_frame_id,
        avatar_border_id: row.avatar_border_id,
        total_points: Number(row.total_points),
        rounds_played: Number(row.rounds_played),
        rank: Number(row.rank),
        is_current_user: user?.id === row.user_id,
        position_change: row.position_change
      }));

      // Apply 6-row logic similar to RoundLeaderboard
      const currentUserEntry = allEntries.find(e => e.is_current_user);
      const currentUserRank = currentUserEntry?.rank || null;

      let displayEntries: LeaderboardEntry[] = [];

      if (!currentUserRank || currentUserRank <= 3) {
        // User is in top 3 or not found: show positions 1-6
        displayEntries = allEntries.slice(0, 6);
      } else {
        // User is outside top 3: show top 3 + user's row + 1 above + 1 below
        const top3 = allEntries.slice(0, 3);
        const userAbove = currentUserRank > 4 ? allEntries.slice(currentUserRank - 2, currentUserRank - 1) : [];
        const userRow = allEntries.slice(currentUserRank - 1, currentUserRank);
        const userBelow = currentUserRank < allEntries.length ? allEntries.slice(currentUserRank, currentUserRank + 1) : [];
        
        displayEntries = [...top3, ...userAbove, ...userRow, ...userBelow];
      }

      setLeaderboard(displayEntries);
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
      return 'border border-green-500/80';
    }
    
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/40 to-amber-500/40';
      case 2:
        return 'bg-gradient-to-r from-gray-400/40 to-gray-500/40';
      case 3:
        return 'bg-gradient-to-r from-orange-400/40 to-orange-500/40';
      default:
        return 'hover:bg-muted/30';
    }
  };

  const timeframes: { key: Timeframe; label: string }[] = [
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

      <main className="flex-grow container mx-auto px-4 py-8 max-w-2xl">
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
        {loading ? (
          // Loading skeleton
          <div className="animate-pulse space-y-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-1">
                <div className="w-6 h-4 bg-muted rounded" />
                <div className="w-5 h-5 bg-muted rounded-full" />
                <div className="w-20 h-3 bg-muted rounded flex-1" />
                <div className="w-12 h-3 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <div className="text-2xl mb-2">🏆</div>
            <p className="text-sm">No rankings yet for this timeframe</p>
          </div>
        ) : (
          <>
            {/* Podium for top 3 */}
            <LeaderboardPodium 
              entries={leaderboard} 
              free={free} 
              premium={premium} 
            />

            {/* Rest of leaderboard (positions 4+) */}
            <div className="space-y-1">
              {leaderboard
                .filter(entry => entry.rank > 3)
                .map((entry) => (
                  <LeaderboardRow
                    key={entry.user_id}
                    entry={entry}
                    free={free}
                    premium={premium}
                    getRankDisplay={getRankDisplay}
                    getRowHighlight={getRowHighlight}
                  />
                ))}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

// Leaderboard Row Component - styled exactly like RoundLeaderboard
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
      className={`flex items-center gap-3 py-2 px-1 rounded transition-colors h-11 ${getRowHighlight(entry.rank, entry.is_current_user)}`}
    >
      {/* Rank */}
      <div className="w-6 flex items-center justify-center">
        <span className="text-sm font-medium text-white">
          {getRankDisplay(entry.rank)}
        </span>
      </div>

      {/* Avatar */}
      <EnhancedAvatar
        src={entry.avatar_url}
        fallback={entry.username.slice(0, 2).toUpperCase()}
        frameUrl={frameAsset}
        borderUrl={borderAsset}
        size="sm"
        className="h-5 w-5"
      />

      {/* Position Change - immediately after avatar */}
      <PositionChangeIndicator change={entry.position_change} size="sm" className="font-bold" />

      {/* Username */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-white">
          {entry.username}
          {entry.is_current_user && (
            <span className="ml-1 text-xs text-green-400">(You)</span>
          )}
        </p>
      </div>

      {/* Points */}
      <div className="text-right">
        <span className="text-sm font-bold text-white">
          {entry.total_points.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default GlobalLeaderboardPage;