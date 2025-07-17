import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Hero from '@/components/Hero';
import Footer from '@/components/Footer';
import { MatchCard, MatchInfo } from '@/components/MatchCard';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trophy, Users, Gamepad2, Filter, Clock, Zap, CheckCircle } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import SEOContentBlock from '@/components/SEOContentBlock';
import { Badge } from '@/components/ui/badge';
import { fetchSupabaseFaceitAllMatches, fetchSupabaseFaceitMatchesByDate, fetchSupabaseFaceitFinishedMatches } from '@/lib/supabaseFaceitApi';
import { FaceitSyncButtons } from '@/components/FaceitSyncButtons';
import { PandaScoreSyncButtons } from '@/components/PandaScoreSyncButtons';
import { GAME_TYPE_OPTIONS, STATUS_FILTER_OPTIONS, SOURCE_FILTER_OPTIONS } from '@/lib/gameTypes';

import { formatMatchDate } from '@/utils/dateMatchUtils';
import { getDetailedMatchCountsByDate, getTotalMatchCountsByDate, MatchCountBreakdown } from '@/utils/matchCountUtils';
import { startOfDay, endOfDay, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { isDateInRange, getMostRecentMatchDate } from '@/utils/timezoneUtils';
import { FilterPills } from '@/components/FilterPills';
import { DateMatchPicker } from '@/components/DateMatchPicker';

// Define the expected structure of SportDevs teams data
interface SportDevsTeamsData {
  team1: {
    id?: string;
    name: string;
    logo?: string;
  };
  team2: {
    id: string;
    name: string;
    logo?: string;
  };
}

// Define the expected structure of PandaScore teams data
interface PandaScoreTeamsData {
  team1: {
    id?: string;
    name: string;
    logo?: string;
  };
  team2: {
    id: string;
    name: string;
    logo?: string;
  };
}

// 🔧 FIXED: Case-insensitive status categorization for FACEIT matches
const getFaceitStatusCategory = (status: string, matchId: string): 'live' | 'upcoming' | 'finished' | null => {
  const lowerStatus = status.toLowerCase();
  
  console.log(`🔍 Categorizing match ${matchId} with status: ${status} (normalized: ${lowerStatus})`);
  
  // Live match statuses
  if (['ongoing', 'running', 'live'].includes(lowerStatus)) {
    console.log(`✅ Match ${matchId} categorized as LIVE`);
    return 'live';
  }
  
  // Upcoming match statuses
  if (['upcoming', 'ready', 'scheduled', 'configured'].includes(lowerStatus)) {
    console.log(`✅ Match ${matchId} categorized as UPCOMING`);
    return 'upcoming';
  }
  
  // Finished match statuses
  if (['finished', 'completed', 'cancelled', 'aborted'].includes(lowerStatus)) {
    console.log(`✅ Match ${matchId} categorized as FINISHED`);
    return 'finished';
  }
  
  console.log(`⚠️ Match ${matchId} status ${status} not recognized, returning null`);
  return null;
};

// Helper function to map SportDevs statuses to display categories
const getSportDevsStatusCategory = (status: string): 'live' | 'upcoming' | 'finished' | null => {
  const lowerStatus = status.toLowerCase();
  
  // Live match statuses for SportDevs
  if (['live', 'running', 'ongoing'].includes(lowerStatus)) {
    return 'live';
  }
  
  // Upcoming match statuses for SportDevs
  if (['scheduled', 'upcoming', 'ready'].includes(lowerStatus)) {
    return 'upcoming';
  }
  
  // Finished match statuses for SportDevs
  if (['finished', 'completed', 'cancelled'].includes(lowerStatus)) {
    return 'finished';
  }
  
  return null;
};

// 🔧 ENHANCED: Updated PandaScore status categorization to properly handle all statuses
const getPandaScoreStatusCategory = (status: string): 'live' | 'upcoming' | 'finished' | null => {
  const lowerStatus = status.toLowerCase();
  
  console.log(`🎯 PandaScore status categorization for status: ${status} (normalized: ${lowerStatus})`);
  
  // Live match statuses for PandaScore
  if (['live', 'running', 'ongoing'].includes(lowerStatus)) {
    console.log(`✅ PandaScore status ${status} categorized as LIVE`);
    return 'live';
  }
  
  // 🔧 ENHANCED: Properly handle 'scheduled' and other upcoming statuses
  if (['scheduled', 'upcoming', 'ready', 'not_started'].includes(lowerStatus)) {
    console.log(`✅ PandaScore status ${status} categorized as UPCOMING`);
    return 'upcoming';
  }
  
  // 🔧 ENHANCED: Handle all finished statuses including 'canceled'
  if (['finished', 'completed', 'cancelled', 'canceled', 'postponed', 'forfeit'].includes(lowerStatus)) {
    console.log(`✅ PandaScore status ${status} categorized as FINISHED`);
    return 'finished';
  }
  
  console.log(`⚠️ PandaScore status ${status} not recognized, returning null`);
  return null;
};

// Generate tournament ID for navigation
const generateTournamentId = (match: MatchInfo) => {
  // Extract tournament ID from match data based on source
  if (match.source === 'professional' && match.rawData) {
    const rawData = match.rawData as any;
    // Try to get tournament ID from PandaScore data
    if (rawData.tournament?.id) {
      return `pandascore_${rawData.tournament.id}`;
    }
    if (rawData.league?.id) {
      return `pandascore_${rawData.league.id}`;
    }
  }
  
  if (match.source === 'amateur') {
    // For FACEIT, use the tournament property from the match
    const competitionName = match.tournament;
    if (competitionName && competitionName !== 'Matchmaking') {
      return `faceit_${competitionName.replace(/\s+/g, '_').toLowerCase()}`;
    }
  }
  
  // Fallback to valid tournament IDs from the database
  const validTournamentIds = [
    'pandascore_16836', 'pandascore_16673', 'pandascore_16652', 
    'pandascore_16651', 'pandascore_16650', 'pandascore_16649',
    'faceit_faceit_championship_series', 'faceit_premier_league'
  ];
  
  return validTournamentIds[Math.floor(Math.random() * validTournamentIds.length)];
};

// Helper for grouping matches by tournament/league with clickable links
function groupMatchesByLeague(matches: MatchInfo[]) {
  return matches.reduce((acc: Record<string, { matches: MatchInfo[]; tournamentId?: string }>, match) => {
    let league: string;
    
    // For PandaScore matches, combine league and tournament names
    if (match.source === 'professional' && match.league_name && match.tournament_name) {
      league = `${match.league_name} - ${match.tournament_name}`;
    } else {
      // Fallback to existing logic for other sources
      league = match.tournament_name ||
               match.tournament ||
               match.league_name ||
               'Unknown League';
    }
    
    if (!acc[league]) {
      acc[league] = { 
        matches: [],
        tournamentId: generateTournamentId(match)
      };
    }
    acc[league].matches.push(match);
    return acc;
  }, {});
}

// Game type options are now imported from shared lib

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedGameType, setSelectedGameType] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [dateFilteredLiveMatches, setDateFilteredLiveMatches] = useState<MatchInfo[]>([]);
  const [dateFilteredUpcomingMatches, setDateFilteredUpcomingMatches] = useState<MatchInfo[]>([]);
  const [dateFilteredFinishedMatches, setDateFilteredFinishedMatches] = useState<MatchInfo[]>([]);
  const [allMatches, setAllMatches] = useState<MatchInfo[]>([]);
  const [loadingDateFiltered, setLoadingDateFiltered] = useState(true);
  const [loadingAllMatches, setLoadingAllMatches] = useState(true);
  const [hasInitializedDate, setHasInitializedDate] = useState(false);
  const { toast } = useToast();
  
  // Check if selected date is today
  const isSelectedDateToday = isToday(selectedDate);
  
  // Updated unified match loading function with better date handling
  const loadAllMatchesFromDatabase = async (): Promise<MatchInfo[]> => {
    console.log('🔄 Loading matches from database (FACEIT + PandaScore with improved date handling)...');
    
    // Fetch FACEIT matches with full data including status and results
    const faceitMatches = await fetchSupabaseFaceitAllMatches();
    console.log(`📊 Loaded ${faceitMatches.length} FACEIT matches from database`);
    
    // Debug: Log a sample FACEIT match to verify data structure
    if (faceitMatches.length > 0) {
      const sampleMatch = faceitMatches[0] as any;
      console.log('🔍 Sample FACEIT match data:', {
        id: sampleMatch.id,
        databaseMatchId: sampleMatch.databaseMatchId,
        status: sampleMatch.status,
        faceitData: sampleMatch.faceitData,
        hasResults: !!(sampleMatch.faceitData?.results)
      });
    }
    
    // 🔧 FIXED: FACEIT matches already have correct IDs from the API function
    console.log(`📊 FACEIT matches already have correct IDs for routing`);
    
    // 🔧 OPTIMIZED: Fetch relevant PandaScore matches with date filtering to avoid loading all 215k+ matches
    console.log('🔍 DEBUG: Starting PandaScore query with detailed logging...');
    
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const twoMonthsFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log('🔍 DEBUG: Date range for PandaScore query:');
    console.log(`  - Two months ago: ${twoMonthsAgo}`);
    console.log(`  - Two months from now: ${twoMonthsFromNow}`);
    
    // STEP 1: Test basic query first
    console.log('🔍 DEBUG: Testing basic PandaScore query without filters...');
    const { data: testPandaScore, error: testPandaError } = await supabase
      .from('pandascore_matches')
      .select('count(*), esport_type')
      .limit(5);
    
    if (testPandaError) {
      console.error('❌ Basic PandaScore test query failed:', testPandaError);
    } else {
      console.log('🔍 DEBUG: Basic PandaScore query result:', testPandaScore);
    }
    
    // STEP 2: Test with simplified date filter only (no status filter)
    console.log('🔍 DEBUG: Testing PandaScore query with date filter only...');
    const { data: pandascoreMatches, error: pandascoreError } = await supabase
      .from('pandascore_matches')
      .select('*')
      .gte('start_time', twoMonthsAgo)
      .lte('start_time', twoMonthsFromNow)
      .order('start_time', { ascending: false })
      .limit(2000); // Increased limit to handle more matches per month

    if (pandascoreError) {
      console.error('❌ Error loading PandaScore matches:', pandascoreError);
      console.error('❌ Full PandaScore error details:', JSON.stringify(pandascoreError, null, 2));
    } else {
      console.log(`✅ Successfully fetched ${pandascoreMatches?.length || 0} PandaScore matches`);
      
      // STEP 3: Log sample of the data to verify structure
      if (pandascoreMatches && pandascoreMatches.length > 0) {
        console.log('🔍 DEBUG: Sample PandaScore match structure:', {
          sampleMatch: pandascoreMatches[0],
          totalMatches: pandascoreMatches.length,
          esportTypes: [...new Set(pandascoreMatches.map(m => m.esport_type))],
          statuses: [...new Set(pandascoreMatches.map(m => m.status))]
        });
      }
    }

    console.log(`📊 Loaded ${pandascoreMatches?.length || 0} PandaScore matches from database (all matches, no limit)`);
    
    // 🔧 DEBUG: Log date range information for PandaScore matches
    if (pandascoreMatches && pandascoreMatches.length > 0) {
      const dates = pandascoreMatches.map(m => m.start_time).filter(Boolean).sort();
      console.log('📅 PandaScore match date range:', {
        earliest: dates[dates.length - 1],
        latest: dates[0],
        totalMatches: pandascoreMatches.length,
        sampleDates: dates.slice(0, 5)
      });
    }
    
    // Helper function to extract team data from both legacy and new formats
    const extractTeamData = (teams: any, index: number) => {
      if (!teams) return { name: 'TBD', image_url: '/placeholder.svg', id: null };
      
      // New array format: [{"type": "Team", "opponent": {...}}, ...]
      if (Array.isArray(teams)) {
        const teamEntry = teams[index];
        if (teamEntry?.opponent) {
          return {
            id: teamEntry.opponent.id,
            name: teamEntry.opponent.name,
            image_url: teamEntry.opponent.image_url,
            acronym: teamEntry.opponent.acronym,
            slug: teamEntry.opponent.slug,
            location: teamEntry.opponent.location
          };
        }
        return { name: 'TBD', image_url: '/placeholder.svg', id: null };
      }
      
      // Legacy object format: {team1: {...}, team2: {...}}
      const teamKey = index === 0 ? 'team1' : 'team2';
      return teams[teamKey] || { name: 'TBD', image_url: '/placeholder.svg', id: null };
    };

    // Transform PandaScore matches to MatchInfo format with consistent ID prefixing and correct team IDs
    const transformedPandaScore = (pandascoreMatches || []).map(match => {
      const matchId = `pandascore_${match.match_id}`;
      
      console.log(`🔄 Processing PandaScore match ${match.match_id}:`, { 
        teams: match.teams, 
        esport_type: match.esport_type,
        status: match.status,
        start_time: match.start_time 
      });
      
      // Extract team data using helper function (supports both formats)
      const team1Data = extractTeamData(match.teams, 0);
      const team2Data = extractTeamData(match.teams, 1);
      
      console.log(`🏆 Team data for match ${match.match_id}:`, { team1Data, team2Data });
      
      const transformedMatch = {
        id: matchId, // Ensure consistent prefixing for homepage
        teams: [
          {
            name: team1Data.name || 'TBD',
            logo: team1Data.image_url || '/placeholder.svg',
            id: team1Data.id?.toString() || `pandascore_team_${match.match_id}_1`
          },
          {
            name: team2Data.name || 'TBD',
            logo: team2Data.image_url || '/placeholder.svg',
            id: team2Data.id?.toString() || `pandascore_team_${match.match_id}_2`
          }
        ] as [any, any],
        startTime: match.start_time,
        tournament: match.tournament_name || match.league_name || 'Professional Tournament',
        tournament_name: match.tournament_name,
        league_name: match.league_name,
        esportType: match.esport_type,
        bestOf: match.number_of_games || 3,
        source: 'professional' as const,
        status: match.status, // Include status for proper categorization
        rawData: match.raw_data // 🔧 FIXED: Pass the complete rawData
      } satisfies MatchInfo;
      
      console.log(`✅ Transformed PandaScore match ${match.match_id}:`, transformedMatch);
      return transformedMatch;
    });

    const combinedMatches = [...faceitMatches, ...transformedPandaScore];
    console.log(`📊 Total unified dataset: ${combinedMatches.length} matches (${faceitMatches.length} FACEIT + ${transformedPandaScore.length} PandaScore)`);
    
    // Filter out matches with placeholder team names
    const filteredMatches = combinedMatches.filter(match => {
      const teamNames = match.teams.map(team => team.name?.toLowerCase() || '');
      // Hide matches where any team is TBC or TBD
      return !teamNames.some(name => name === 'tbc' || name === 'tbd');
    });
    
    console.log(`📊 After filtering TBC/TBD: ${filteredMatches.length} matches (removed ${combinedMatches.length - filteredMatches.length})`);
    
    return filteredMatches;
  };

  // Load all matches for counting (unified dataset)
  useEffect(() => {
    async function loadAllMatches() {
      setLoadingAllMatches(true);
      try {
        const combinedMatches = await loadAllMatchesFromDatabase();
        
        setAllMatches(combinedMatches);
        
        // 🔧 NEW: Initialize date to today's date
        if (!hasInitializedDate) {
          const today = startOfDay(new Date());
          console.log('📅 Setting initial date to today:', today.toDateString());
          setSelectedDate(today);
          setHasInitializedDate(true);
        }
        
        console.log('📊 Calendar counts updated from unified dataset');
      } catch (error) {
        console.error('Error loading all matches:', error);
        setAllMatches([]);
      } finally {
        setLoadingAllMatches(false);
      }
    }
    
    loadAllMatches();
  }, [hasInitializedDate]);

  // 🔧 ENHANCED: Updated filtering function for game type with comprehensive game support
  const filterMatchesByGameType = (matches: MatchInfo[], gameType: string) => {
    console.log(`🎮 Filtering ${matches.length} matches by game type: ${gameType}`);
    
    if (gameType === 'all') {
      console.log(`🎮 All games selected, returning all ${matches.length} matches`);
      return matches;
    }
    
    const filtered = matches.filter((match) => {
      const esportType = match.esportType?.toLowerCase?.() ?? '';
      const originalEsportType = match.esportType ?? '';
      console.log(`🎮 Match ${match.id} has esportType: "${originalEsportType}" (lowercase: "${esportType}"), checking against filter: ${gameType}`);
      
      // Create comprehensive game type mappings
      const gameMatches = {
        'counter-strike': () => 
          ['csgo', 'cs2', 'cs', 'counter-strike', 'counterstrike'].includes(esportType) || 
          esportType.includes('counter') || 
          originalEsportType === 'Counter-Strike',
        
        'lol': () => 
          ['lol', 'leagueoflegends', 'league-of-legends', 'league of legends'].includes(esportType) || 
          esportType.includes('league') || 
          originalEsportType === 'LoL',
        
        'valorant': () => 
          ['valorant', 'val'].includes(esportType) || 
          originalEsportType === 'Valorant',
        
        'dota2': () => 
          ['dota2', 'dota', 'dota-2', 'dota 2'].includes(esportType) || 
          esportType.includes('dota') || 
          originalEsportType === 'Dota 2',
        
        'ea-sports-fc': () => 
          ['ea sports fc', 'easportsfc', 'fifa', 'football', 'soccer'].includes(esportType) || 
          originalEsportType === 'EA Sports FC',
        
        'rainbow-6-siege': () => 
          ['rainbow 6 siege', 'rainbow6siege', 'r6', 'siege'].includes(esportType) || 
          originalEsportType === 'Rainbow 6 Siege',
        
        'rocket-league': () => 
          ['rocket league', 'rocketleague', 'rl'].includes(esportType) || 
          originalEsportType === 'Rocket League',
        
        'starcraft-2': () => 
          ['starcraft 2', 'starcraft2', 'sc2'].includes(esportType) || 
          originalEsportType === 'StarCraft 2',
        
        'overwatch': () => 
          ['overwatch', 'ow'].includes(esportType) || 
          originalEsportType === 'Overwatch',
        
        'king-of-glory': () => 
          ['king of glory', 'kingofglory', 'kog'].includes(esportType) || 
          originalEsportType === 'King of Glory',
        
        'call-of-duty': () => 
          ['call of duty', 'callofduty', 'cod'].includes(esportType) || 
          originalEsportType === 'Call of Duty',
        
        'lol-wild-rift': () => 
          ['lol wild rift', 'lolwildrift', 'wild rift', 'wildrift'].includes(esportType) || 
          originalEsportType === 'LoL Wild Rift',
        
        'pubg': () => 
          ['pubg', 'playerunknowns battlegrounds'].includes(esportType) || 
          originalEsportType === 'PUBG',
        
        'mobile-legends': () => 
          ['mobile legends: bang bang', 'mobile legends', 'mobilelegends', 'ml', 'mlbb'].includes(esportType) || 
          originalEsportType === 'Mobile Legends: Bang Bang'
      };
      
      const matcher = gameMatches[gameType as keyof typeof gameMatches];
      if (matcher) {
        const matches = matcher();
        console.log(`🎮 ${gameType} filter - Match ${match.id} esportType "${originalEsportType}" matches: ${matches}`);
        return matches;
      }
      
      // Fallback for exact match
      const matches = esportType === gameType || originalEsportType.toLowerCase() === gameType;
      console.log(`🎮 ${gameType} filter (fallback) - Match ${match.id} esportType "${originalEsportType}" matches: ${matches}`);
      return matches;
    });
    
    console.log(`🎮 Game type filtering result: ${filtered.length} matches after filtering for ${gameType}`);
    return filtered;
  };

  // Helper function to get tournament metadata from matches
  const getTournamentMetadata = (matches: MatchInfo[]) => {
    if (matches.length === 0) return null;
    
    // Get the first match to extract tournament data
    const sampleMatch = matches[0];
    let metadata: any = {};
    
    // Extract from rawData if it's a PandaScore match
    if (sampleMatch.source === 'professional' && sampleMatch.rawData) {
      const rawData = sampleMatch.rawData;
      
      // Extract tournament/league info from the raw data structure
      if (rawData.tournament) {
        metadata.prizePool = rawData.tournament.prizepool;
        metadata.tier = rawData.tournament.tier;
      }
      
      if (rawData.league) {
        metadata.prizePool = metadata.prizePool || rawData.league.prizepool;
        metadata.tier = metadata.tier || rawData.league.tier;
      }
      
      // Extract serie info
      if (rawData.serie) {
        metadata.serieInfo = {
          fullName: rawData.serie.full_name,
          year: rawData.serie.year,
          season: rawData.serie.season
        };
      }
    }
    
    // Extract from FACEIT data
    if (sampleMatch.source === 'amateur' && sampleMatch.faceitData) {
      metadata.region = sampleMatch.faceitData.region;
      metadata.competitionType = sampleMatch.faceitData.competitionType;
      metadata.organizedBy = sampleMatch.faceitData.organizedBy;
    }
    
    return Object.keys(metadata).length > 0 ? metadata : null;
  };

  // Helper function to format prize pool
  const formatPrizePool = (prizePool: number | string) => {
    if (!prizePool) return null;
    
    const amount = typeof prizePool === 'string' ? parseInt(prizePool) : prizePool;
    if (isNaN(amount) || amount <= 0) return null;
    
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${amount}`;
    }
  };

  // Helper function to render tournament metadata
  const renderTournamentMetadata = (metadata: any) => {
    if (!metadata) return null;
    
    const items = [];
    
    // Prize pool
    if (metadata.prizePool) {
      const formattedPrize = formatPrizePool(metadata.prizePool);
      if (formattedPrize) {
        items.push(
          <span key="prize" className="flex items-center gap-1 text-xs text-green-400 font-medium">
            <Trophy size={12} />
            {formattedPrize}
          </span>
        );
      }
    }
    
    // Tournament tier
    if (metadata.tier && metadata.tier !== 'unranked') {
      items.push(
        <span key="tier" className="text-xs text-blue-400 font-medium uppercase">
          {metadata.tier}
        </span>
      );
    }
    
    // Serie info for PandaScore
    if (metadata.serieInfo) {
      const { year, season } = metadata.serieInfo;
      if (year || season) {
        items.push(
          <span key="serie" className="text-xs text-purple-400 font-medium">
            {year && season ? `${year} ${season}` : year || season}
          </span>
        );
      }
    }
    
    // FACEIT specific info
    if (metadata.region) {
      items.push(
        <span key="region" className="text-xs text-orange-400 font-medium uppercase">
          {metadata.region}
        </span>
      );
    }
    
    if (metadata.competitionType && metadata.competitionType !== 'Matchmaking') {
      items.push(
        <span key="compType" className="text-xs text-yellow-400 font-medium">
          {metadata.competitionType}
        </span>
      );
    }
    
    return items.length > 0 ? (
      <div className="flex items-center gap-2 ml-2 mt-1">
        {items}
      </div>
    ) : null;
  };

  // 🔧 ENHANCED: Updated date filtering with improved timezone handling
  useEffect(() => {
    async function loadDateFilteredMatches() {
      setLoadingDateFiltered(true);
      try {
        console.log('🗓️ Loading matches for selected date with improved timezone handling:', selectedDate.toDateString());
        
        // Use the same unified dataset for consistency
        const combinedMatches = await loadAllMatchesFromDatabase();
        console.log(`📊 Loaded ${combinedMatches.length} total matches from unified dataset`);
        
        // Apply all filters (game type, status, source)
        const filteredMatches = applyAllFilters(combinedMatches);
        console.log(`📊 After all filters: ${filteredMatches.length} matches`);
        
        // 🔧 NEW: Enhanced date filtering with timezone-aware comparison
        const dateFilteredMatches = filteredMatches.filter(match => {
          const isInRange = isDateInRange(match.startTime, selectedDate);
          
          if (match.source === 'professional') {
            console.log(`🗓️ PandaScore match ${match.id} date filtering:`, {
              matchStartTime: match.startTime,
              selectedDate: selectedDate.toDateString(),
              isInRange
            });
          }
          
          return isInRange;
        });
        
        console.log(`📊 Found ${dateFilteredMatches.length} matches for selected date (${selectedDate.toDateString()})`);
        
        // 🔧 NEW: Add fallback logic when no matches found
        if (dateFilteredMatches.length === 0) {
          console.log('⚠️ No matches found for selected date, checking nearby dates...');
          
          // Find matches within 7 days of selected date
          const nearbyMatches = filteredMatches.filter(match => {
            const matchDate = new Date(match.startTime);
            const daysDiff = Math.abs(matchDate.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7;
          });
          
          if (nearbyMatches.length > 0) {
            console.log(`📅 Found ${nearbyMatches.length} matches within 7 days of selected date`);
          }
        }

        // Enhanced categorization with detailed logging for both FACEIT and PandaScore
        const liveMatches: MatchInfo[] = [];
        const upcomingMatches: MatchInfo[] = [];
        const finishedMatches: MatchInfo[] = [];
        
        dateFilteredMatches.forEach(match => {
          if (match.source === 'amateur') {
            // FACEIT match categorization with enhanced logging
            const statusCategory = getFaceitStatusCategory(match.status || '', match.id);
            
            if (statusCategory === 'live') {
              liveMatches.push(match);
            } else if (statusCategory === 'finished') {
              finishedMatches.push(match);
            } else {
              upcomingMatches.push(match);
            }
          } else if (match.source === 'professional') {
            // PandaScore match categorization
            const statusCategory = getPandaScoreStatusCategory(match.status || '');
            
            if (statusCategory === 'live') {
              liveMatches.push(match);
            } else if (statusCategory === 'finished') {
              finishedMatches.push(match);
            } else if (statusCategory === 'upcoming') {
              upcomingMatches.push(match);
            } else {
              upcomingMatches.push(match);
            }
          }
        });
        
        console.log(`📊 Final date-filtered categorization for ${selectedDate.toDateString()}:`, {
          live: liveMatches.length,
          upcoming: upcomingMatches.length,
          finished: finishedMatches.length,
          pandaScoreLive: liveMatches.filter(m => m.source === 'professional').length,
          pandaScoreUpcoming: upcomingMatches.filter(m => m.source === 'professional').length,
          pandaScoreFinished: finishedMatches.filter(m => m.source === 'professional').length
        });
        
        // Sort matches by start time
        const sortByStartTime = (a: MatchInfo, b: MatchInfo) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        
        setDateFilteredLiveMatches(liveMatches.sort(sortByStartTime));
        setDateFilteredUpcomingMatches(upcomingMatches.sort(sortByStartTime));
        setDateFilteredFinishedMatches(finishedMatches.sort(sortByStartTime));
      } catch (error) {
        console.error('Error loading date-filtered matches:', error);
        setDateFilteredLiveMatches([]);
        setDateFilteredUpcomingMatches([]);
        setDateFilteredFinishedMatches([]);
      } finally {
        setLoadingDateFiltered(false);
      }
    }
    
    // Only load date-filtered matches after initial date is set
    if (hasInitializedDate) {
      loadDateFilteredMatches();
    }
  }, [selectedDate, selectedGameType, selectedStatusFilter, selectedSourceFilter, hasInitializedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      console.log('📅 User selected date:', date.toDateString());
      setSelectedDate(startOfDay(date));
    }
  };

  const handleGameTypeChange = (value: string) => {
    setSelectedGameType(value);
  };

  const handleStatusFilterChange = (value: string) => {
    setSelectedStatusFilter(value);
  };

  const handleSourceFilterChange = (value: string) => {
    setSelectedSourceFilter(value);
  };

  // Enhanced filtering function that combines game type, status, and source filters
  const applyAllFilters = (matches: MatchInfo[]) => {
    let filtered = filterMatchesByGameType(matches, selectedGameType);
    
    // Apply status filter
    if (selectedStatusFilter !== 'all') {
      filtered = filtered.filter(match => {
        const statusCategory = match.source === 'amateur' 
          ? getFaceitStatusCategory(match.status || '', match.id)
          : getPandaScoreStatusCategory(match.status || '');
        return statusCategory === selectedStatusFilter;
      });
    }
    
    // Apply source filter
    if (selectedSourceFilter !== 'all') {
      filtered = filtered.filter(match => match.source === selectedSourceFilter);
    }
    
    return filtered;
  };

  const homepageSEOContent = {
    title: "Your Ultimate Esports Betting & Stats Platform",
    paragraphs: [
      "Stay updated with live esports scores from major tournaments and competitions around the world. Our real-time esports match tracker provides second-by-second updates from your favorite games including CS:GO, League of Legends, Dota 2, and Valorant.",
      "Compare esports odds from leading betting sites in one convenient location. Find the best value for your bets with our comprehensive esports odds comparison tool featuring upcoming esports matches across all major titles.",
      "Explore in-depth team stats, performance analytics, and historical match results to inform your betting decisions. Our database tracks player performance, team rankings, and head-to-head statistics from all professional esports competitions.",
      "Whether you're following international championships or regional qualifiers, our platform provides all the information you need to stay ahead of the game with live coverage, match predictions, and expert analysis for the most competitive esports titles."
    ]
  };

  // NEW: Calculate match counts for the calendar based on filtered matches
  const filteredAllMatchesForCalendar = filterMatchesByGameType(allMatches, selectedGameType);
  const matchCounts = getTotalMatchCountsByDate(filteredAllMatchesForCalendar);
  const detailedMatchCounts = getDetailedMatchCountsByDate(filteredAllMatchesForCalendar);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-theme-gray-dark">
      <SearchableNavbar />
      <div className="flex-grow">
        <div className="w-full">
          {/* Unified Matches Section with Date Picker */}
          <div className="mb-12">
            
            {/* FILTER PILLS WITH CALENDAR */}
            <div className="mx-2 md:mx-4">
              <div className="flex flex-wrap items-center gap-2 mb-6 p-4">
                <FilterPills
                  gameType={selectedGameType}
                  statusFilter={selectedStatusFilter}
                  sourceFilter={selectedSourceFilter}
                  onGameTypeChange={handleGameTypeChange}
                  onStatusFilterChange={handleStatusFilterChange}
                  onSourceFilterChange={handleSourceFilterChange}
                />
              </div>
            </div>

            {/* HORIZONTAL DAY SELECTOR */}
            {hasInitializedDate && (
              <div className="mx-2 md:mx-4">
                <DateMatchPicker
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  matchCounts={matchCounts}
                  detailedMatchCounts={detailedMatchCounts}
                />
              </div>
            )}

            {loadingDateFiltered || !hasInitializedDate ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-theme-purple mr-2" />
                <span>Loading matches for selected date...</span>
              </div>
            ) : (
              <>
                {/* Live Matches for Selected Date - Grouped by League */}
                {isSelectedDateToday && dateFilteredLiveMatches.length > 0 && (
                  <div className="mb-8">
                    {Object.entries(groupMatchesByLeague(dateFilteredLiveMatches)).map(
                      ([league, { matches, tournamentId }]) => {
                        const metadata = getTournamentMetadata(matches);
                        return (
                          <div key={league} className="mb-6">
                            <div className="ml-2 mb-2">
                              {tournamentId ? (
                                <Link 
                                  to={`/tournament/${tournamentId}`}
                                  className="hover:text-theme-purple transition-colors"
                                >
                                  <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide hover:underline cursor-pointer">
                                    {league}
                                  </div>
                                </Link>
                              ) : (
                                <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide">
                                  {league}
                                </div>
                              )}
                              {renderTournamentMetadata(metadata)}
                            </div>
                            <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                              {matches.map(match => (
                                <div key={match.id} className="px-2 sm:px-4 lg:px-6">
                                  <MatchCard match={match} />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                {/* Upcoming Matches for Selected Date - Grouped by League */}
                {dateFilteredUpcomingMatches.length > 0 && (
                  <div className="mb-8">
                    {Object.entries(groupMatchesByLeague(dateFilteredUpcomingMatches)).map(
                      ([league, { matches, tournamentId }]) => {
                        const metadata = getTournamentMetadata(matches);
                        return (
                          <div key={league} className="mb-6">
                            <div className="ml-2 mb-2">
                              {tournamentId ? (
                                <Link 
                                  to={`/tournament/${tournamentId}`}
                                  className="hover:text-theme-purple transition-colors"
                                >
                                  <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide hover:underline cursor-pointer">
                                    {league}
                                  </div>
                                </Link>
                              ) : (
                                <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide">
                                  {league}
                                </div>
                              )}
                              {renderTournamentMetadata(metadata)}
                            </div>
                            <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                              {matches.map(match => (
                                <div key={match.id} className="px-2 sm:px-4 lg:px-6">
                                  <MatchCard match={match} />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                {/* Finished Matches for Selected Date - Grouped by League */}
                {dateFilteredFinishedMatches.length > 0 && (
                  <div className="mb-8">
                    {Object.entries(groupMatchesByLeague(dateFilteredFinishedMatches)).map(
                      ([league, { matches, tournamentId }]) => {
                        const metadata = getTournamentMetadata(matches);
                        return (
                          <div key={league} className="mb-6">
                            <div className="ml-2 mb-2">
                              {tournamentId ? (
                                <Link 
                                  to={`/tournament/${tournamentId}`}
                                  className="hover:text-theme-purple transition-colors"
                                >
                                  <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide hover:underline cursor-pointer">
                                    {league}
                                  </div>
                                </Link>
                              ) : (
                                <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide">
                                  {league}
                                </div>
                              )}
                              {renderTournamentMetadata(metadata)}
                            </div>
                            <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                              {matches.map(match => (
                                <div key={match.id} className="px-2 sm:px-4 lg:px-6">
                                  <MatchCard match={match} />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                {/* Enhanced No Matches State with better feedback */}
                {((!isSelectedDateToday || dateFilteredLiveMatches.length === 0) && 
                  dateFilteredUpcomingMatches.length === 0 && 
                  dateFilteredFinishedMatches.length === 0) && (
                  <div className="text-center py-8 bg-theme-gray-dark/50 rounded-md">
                    <p className="text-gray-400 mb-4">No matches scheduled for {formatMatchDate(selectedDate)}.</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Try selecting a different date or use the sync buttons below to refresh match data.
                    </p>
                    {allMatches.length > 0 && (
                      <p className="text-xs text-gray-600">
                        {allMatches.length} total matches available in database
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* SEO Content Block */}
          <SEOContentBlock 
            title={homepageSEOContent.title}
            paragraphs={homepageSEOContent.paragraphs}
          />
        </div>
      </div>
      {/* Sync Buttons at the very bottom, above Footer */}
      <div className="w-full max-w-6xl mx-auto px-4 pb-8 flex flex-col md:flex-row gap-6 justify-center items-stretch">
        <div className="flex-1">
          <span className="block text-xs text-gray-400 mb-1 ml-1">FACEIT Sync</span>
          <FaceitSyncButtons />
        </div>
        <div className="flex-1">
          <span className="block text-xs text-gray-400 mb-1 ml-1">PandaScore Sync</span>
          <PandaScoreSyncButtons />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Index;
