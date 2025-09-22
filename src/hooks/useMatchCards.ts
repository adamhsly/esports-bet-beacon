import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LightweightMatchCard {
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
  source: 'amateur' | 'professional';
}

interface UseMatchCardsProps {
  date: Date;
  gameType?: string;
  statusFilter?: string;
  sourceFilter?: string;
  pageSize?: number;
}

export function useMatchCards({ 
  date, 
  gameType = 'all', 
  statusFilter = 'all', 
  sourceFilter = 'all',
  pageSize = 50 
}: UseMatchCardsProps) {
  const [cards, setCards] = useState<LightweightMatchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  const resetCards = useCallback(() => {
    setCards([]);
    setCursor(null);
    setHasMore(true);
    setError(null);
  }, []);

  const loadCards = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) {
      setLoading(true);
    }
    
    try {
      console.log('🃏 Fetching match cards for date:', date.toISOString().split('T')[0]);
      
      const { data, error: dbError } = await supabase.rpc(
        'get_match_cards_paginated',
        {
          target_date: date.toISOString().split('T')[0],
          page_size: pageSize,
          cursor_time: cursor
        }
      );

      if (dbError) {
        console.error('❌ Error fetching match cards:', dbError);
        setError(dbError.message);
        return;
      }

      const newCards = Array.isArray(data) ? data : [];
      
      // Apply client-side filters
      let filteredCards = newCards;
      
      // Game type filter
      if (gameType !== 'all') {
        filteredCards = filteredCards.filter(card => {
          const esportType = card.esport_type?.toLowerCase() || '';
          // Use the same filtering logic as before
          const gameMatches = {
            'counter-strike': ['csgo', 'cs2', 'cs', 'counter-strike', 'counterstrike'],
            'lol': ['lol', 'leagueoflegends', 'league-of-legends', 'league of legends'],
            'valorant': ['valorant', 'val'],
            'dota2': ['dota2', 'dota', 'dota-2', 'dota 2'],
            'ea-sports-fc': ['ea sports fc', 'easportsfc', 'fifa', 'football', 'soccer'],
            'rainbow-6-siege': ['rainbow 6 siege', 'rainbow6siege', 'r6', 'siege'],
            'rocket-league': ['rocket league', 'rocketleague', 'rl'],
            'starcraft-2': ['starcraft 2', 'starcraft2', 'sc2'],
            'overwatch': ['overwatch', 'ow'],
            'king-of-glory': ['king of glory', 'kingofglory', 'kog'],
            'call-of-duty': ['call of duty', 'callofduty', 'cod'],
            'lol-wild-rift': ['lol wild rift', 'lolwildrift', 'wild rift', 'wildrift'],
            'pubg': ['pubg', 'playerunknowns battlegrounds'],
            'mobile-legends': ['mobile legends: bang bang', 'mobile legends', 'mobilelegends', 'ml', 'mlbb']
          };
          
          const allowedTypes = gameMatches[gameType as keyof typeof gameMatches];
          return allowedTypes ? allowedTypes.includes(esportType) : esportType === gameType;
        });
      }

      // Status filter
      if (statusFilter !== 'all') {
        filteredCards = filteredCards.filter(card => {
          const status = card.status?.toLowerCase() || '';
          switch (statusFilter) {
            case 'live':
              return ['ongoing', 'running', 'live'].includes(status);
            case 'upcoming':
              return ['scheduled', 'upcoming', 'ready', 'configured'].includes(status);
            case 'finished':
              return ['finished', 'completed', 'cancelled', 'aborted'].includes(status);
            default:
              return true;
          }
        });
      }

      // Source filter
      if (sourceFilter !== 'all') {
        filteredCards = filteredCards.filter(card => {
          if (sourceFilter === 'professional') return card.source === 'professional';
          if (sourceFilter === 'amateur') return card.source === 'amateur';
          return true;
        });
      }

      // Type assertion to ensure source compatibility
      const typedCards = filteredCards.map(card => ({
        ...card,
        source: card.source as 'amateur' | 'professional'
      }));

      if (isLoadMore) {
        setCards(prev => [...prev, ...typedCards]);
      } else {
        setCards(typedCards);
      }

      // Update cursor for pagination
      if (newCards.length > 0) {
        const lastCard = newCards[newCards.length - 1];
        setCursor(lastCard.start_time);
      }

      // Check if there are more cards to load
      setHasMore(newCards.length === pageSize);

      console.log(`✅ Loaded ${filteredCards.length} match cards for ${date.toISOString().split('T')[0]}`);
      
    } catch (err) {
      console.error('❌ Error in useMatchCards:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [date, gameType, statusFilter, sourceFilter, pageSize, cursor]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadCards(true);
    }
  }, [loadCards, loading, hasMore]);

  // Reset and load cards when dependencies change
  useEffect(() => {
    resetCards();
  }, [date, gameType, statusFilter, sourceFilter, resetCards]);

  // Load cards after reset
  useEffect(() => {
    if (cards.length === 0 && !loading) {
      loadCards(false);
    }
  }, [cards.length, loadCards, loading]);

  return {
    cards,
    loading,
    error,
    hasMore,
    loadMore,
    resetCards
  };
}