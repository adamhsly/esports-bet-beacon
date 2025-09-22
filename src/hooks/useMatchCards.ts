import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MatchInfo } from '@/components/MatchCard';
import { format } from 'date-fns';

interface UseMatchCardsReturn {
  liveMatches: MatchInfo[];
  upcomingMatches: MatchInfo[];
  finishedMatches: MatchInfo[];
  loading: boolean;
  error: string | null;
}

interface MatchCardData {
  match_id: string;
  match_date: string;
  team1_name: string;
  team1_logo: string;
  team1_id: string;
  team2_name: string;
  team2_logo: string;
  team2_id: string;
  start_time: string;
  tournament: string;
  esport_type: string;
  status: string;
  best_of: number;
  source: string;
}

export const useMatchCards = (
  selectedDate: Date,
  gameTypeFilter: string,
  statusFilter: string,
  sourceFilter: string
): UseMatchCardsReturn => {
  const [matchCards, setMatchCards] = useState<MatchCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch lightweight match cards for the selected date
  useEffect(() => {
    const fetchMatchCards = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        console.log('🃏 Fetching optimized match cards for date:', dateKey);
        
        const { data, error: rpcError } = await supabase.rpc('get_match_cards_paginated', {
          target_date: dateKey,
          page_size: 500, // Reasonable page size
          cursor_time: null // Start from beginning
        });

        if (rpcError) {
          console.error('❌ Error fetching match cards:', rpcError);
          throw new Error(rpcError.message);
        }

        console.log(`🃏 Retrieved ${data?.length || 0} lightweight match cards`);
        setMatchCards(data || []);

      } catch (err) {
        console.error('❌ Error in useMatchCards:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch match cards');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchCards();
  }, [selectedDate]);

  // Transform and filter the data
  const { liveMatches, upcomingMatches, finishedMatches } = useMemo(() => {
    const transformCardToMatchInfo = (card: MatchCardData): MatchInfo => {
      return {
        id: `${card.source === 'amateur' ? 'faceit' : 'pandascore'}_${card.match_id}`,
        teams: [
          {
            name: card.team1_name,
            logo: card.team1_logo,
            id: card.team1_id
          },
          {
            name: card.team2_name,
            logo: card.team2_logo,
            id: card.team2_id
          }
        ] as [any, any],
        startTime: card.start_time,
        tournament: card.tournament,
        tournament_name: card.tournament,
        esportType: card.esport_type,
        bestOf: card.best_of,
        source: card.source === 'amateur' ? 'amateur' : 'professional',
        status: card.status,
        // No heavy data - will be fetched on-demand when card is expanded
        rawData: null,
        faceitData: null
      };
    };

    const categorizeMatch = (status: string, startTime: string): 'live' | 'upcoming' | 'finished' => {
      const normalizedStatus = status.toLowerCase();
      
      // Finished statuses
      if (['finished', 'completed', 'cancelled', 'aborted'].includes(normalizedStatus)) {
        return 'finished';
      }
      
      // Live statuses
      if (['ongoing', 'running', 'live'].includes(normalizedStatus)) {
        return 'live';
      }
      
      // Time-based categorization for ambiguous statuses
      const now = new Date();
      const matchStart = new Date(startTime);
      const hasStarted = now >= matchStart;
      
      if (hasStarted && !['finished', 'completed', 'cancelled', 'aborted'].includes(normalizedStatus)) {
        return 'live';
      }
      
      return 'upcoming';
    };

    const applyFilters = (matches: MatchInfo[]) => {
      return matches.filter(match => {
        // Game type filter
        if (gameTypeFilter !== 'all') {
          const esportType = match.esportType?.toLowerCase() || '';
          
          const gameMatches = {
            'counter-strike': () => ['csgo', 'cs2', 'cs', 'counter-strike', 'counterstrike'].includes(esportType) || esportType.includes('counter'),
            'lol': () => ['lol', 'leagueoflegends', 'league-of-legends', 'league of legends'].includes(esportType) || esportType.includes('league'),
            'valorant': () => ['valorant', 'val'].includes(esportType),
            'dota2': () => ['dota2', 'dota', 'dota-2', 'dota 2'].includes(esportType) || esportType.includes('dota'),
            'ea-sports-fc': () => ['ea sports fc', 'easportsfc', 'fifa', 'football', 'soccer'].includes(esportType),
            'rainbow-6-siege': () => ['rainbow 6 siege', 'rainbow6siege', 'r6', 'siege'].includes(esportType),
            'rocket-league': () => ['rocket league', 'rocketleague', 'rl'].includes(esportType),
            'starcraft-2': () => ['starcraft 2', 'starcraft2', 'sc2'].includes(esportType),
            'overwatch': () => ['overwatch', 'ow'].includes(esportType),
            'king-of-glory': () => ['king of glory', 'kingofglory', 'kog'].includes(esportType),
            'call-of-duty': () => ['call of duty', 'callofduty', 'cod'].includes(esportType),
            'lol-wild-rift': () => ['lol wild rift', 'lolwildrift', 'wild rift', 'wildrift'].includes(esportType),
            'pubg': () => ['pubg', 'playerunknowns battlegrounds'].includes(esportType),
            'mobile-legends': () => ['mobile legends: bang bang', 'mobile legends', 'mobilelegends', 'ml', 'mlbb'].includes(esportType)
          };
          
          const matcher = gameMatches[gameTypeFilter as keyof typeof gameMatches];
          if (matcher && !matcher()) {
            return false;
          }
        }
        
        // Source filter
        if (sourceFilter !== 'all') {
          if (sourceFilter === 'professional' && match.source !== 'professional') return false;
          if (sourceFilter === 'amateur' && match.source !== 'amateur') return false;
        }
        
        return true;
      });
    };

    // Transform and categorize matches
    const transformedMatches = matchCards.map(transformCardToMatchInfo);
    const categorizedMatches = {
      live: [] as MatchInfo[],
      upcoming: [] as MatchInfo[],
      finished: [] as MatchInfo[]
    };

    transformedMatches.forEach(match => {
      const category = categorizeMatch(match.status || '', match.startTime);
      categorizedMatches[category].push(match);
    });

    // Apply filters to each category
    const filteredLive = applyFilters(categorizedMatches.live);
    const filteredUpcoming = applyFilters(categorizedMatches.upcoming);
    const filteredFinished = applyFilters(categorizedMatches.finished);

    // Apply status filter
    if (statusFilter === 'live') {
      return { liveMatches: filteredLive, upcomingMatches: [], finishedMatches: [] };
    } else if (statusFilter === 'upcoming') {
      return { liveMatches: [], upcomingMatches: filteredUpcoming, finishedMatches: [] };
    } else if (statusFilter === 'finished') {
      return { liveMatches: [], upcomingMatches: [], finishedMatches: filteredFinished };
    }

    return {
      liveMatches: filteredLive,
      upcomingMatches: filteredUpcoming,
      finishedMatches: filteredFinished
    };
  }, [matchCards, gameTypeFilter, statusFilter, sourceFilter]);

  return {
    liveMatches,
    upcomingMatches,
    finishedMatches,
    loading,
    error
  };
};