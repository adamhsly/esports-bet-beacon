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
import { FaceitSyncButtons } from '@/components/FaceitSyncButtons';
import { PandaScoreSyncButtons } from '@/components/PandaScoreSyncButtons';
import { GAME_TYPE_OPTIONS, STATUS_FILTER_OPTIONS, SOURCE_FILTER_OPTIONS } from '@/lib/gameTypes';
import LiveDataTestPanel from '@/components/LiveDataTestPanel';
import { formatMatchDate } from '@/utils/dateMatchUtils';
import { MatchCountBreakdown, getDetailedMatchCountsByDate, getTotalMatchCountsByDate as getTotalMatchCountsFromMatches } from '@/utils/matchCountUtils';
import { startOfDay, endOfDay, isToday, subMonths, addMonths, format } from 'date-fns';
import { isDateInRange, getMostRecentMatchDate } from '@/utils/timezoneUtils';
import { FilterPills } from '@/components/FilterPills';
import { EsportsLogoFilter } from '@/components/EsportsLogoFilter';
import { DateMatchPicker } from '@/components/DateMatchPicker';
import { useMatchCounts, getTotalMatchCountsByDate } from '@/hooks/useMatchCounts';
import { useMatchCards } from '@/hooks/useMatchCards';
import { OptimizedMatchCard } from '@/components/OptimizedMatchCard';

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

// 🔧 FIXED: Database status-based categorization for FACEIT matches
const getFaceitStatusCategory = (status: string, matchId: string, startTime?: string): 'live' | 'upcoming' | 'finished' | null => {
  const lowerStatus = status.toLowerCase();
  console.log(`🔍 Categorizing match ${matchId} with status: ${status} (normalized: ${lowerStatus})`);

  // Use actual database status instead of time-based logic
  if (['finished', 'completed', 'cancelled', 'aborted'].includes(lowerStatus)) {
    console.log(`✅ Match ${matchId} categorized as FINISHED`);
    return 'finished';
  }
  if (['ongoing', 'running', 'live'].includes(lowerStatus)) {
    console.log(`✅ Match ${matchId} categorized as LIVE (explicit status)`);
    return 'live';
  }
  if (['upcoming', 'ready', 'scheduled', 'configured'].includes(lowerStatus)) {
    console.log(`✅ Match ${matchId} categorized as UPCOMING`);
    return 'upcoming';
  }
  console.log(`⚠️ Match ${matchId} status ${status} not recognized, returning null`);
  return null;
};

// Helper function to map SportDevs statuses to display categories with time-based logic
const getSportDevsStatusCategory = (status: string, startTime?: string): 'live' | 'upcoming' | 'finished' | null => {
  const lowerStatus = status.toLowerCase();

  // Finished match statuses (always respect finished status)
  if (['finished', 'completed', 'cancelled'].includes(lowerStatus)) {
    return 'finished';
  }

  // Time-based live status determination
  if (startTime) {
    const now = new Date();
    const matchStart = new Date(startTime);
    const hasStarted = now >= matchStart;
    if (hasStarted && !['finished', 'completed', 'cancelled'].includes(lowerStatus)) {
      return 'live';
    }
  }

  // Default live status fallback for explicit live statuses
  if (['live', 'running', 'ongoing'].includes(lowerStatus)) {
    return 'live';
  }

  // Upcoming match statuses for SportDevs
  if (['scheduled', 'upcoming', 'ready'].includes(lowerStatus)) {
    return 'upcoming';
  }
  return null;
};

// 🔧 ENHANCED: Time-based PandaScore status categorization
const getPandaScoreStatusCategory = (status: string, startTime?: string): 'live' | 'upcoming' | 'finished' | null => {
  const lowerStatus = status.toLowerCase();
  console.log(`🎯 PandaScore status categorization for status: ${status} (normalized: ${lowerStatus})`);

  // Finished match statuses (always respect finished status)
  if (['finished', 'completed', 'cancelled'].includes(lowerStatus)) {
    console.log(`✅ PandaScore status ${status} categorized as FINISHED`);
    return 'finished';
  }

  // Time-based live status determination
  if (startTime) {
    const now = new Date();
    const matchStart = new Date(startTime);
    const hasStarted = now >= matchStart;
    if (hasStarted && !['finished', 'completed', 'cancelled'].includes(lowerStatus)) {
      console.log(`✅ PandaScore status ${status} categorized as LIVE (past start time: ${startTime})`);
      return 'live';
    }
  }

  // Default live status fallback for explicit live statuses
  if (['live', 'running', 'ongoing'].includes(lowerStatus)) {
    console.log(`✅ PandaScore status ${status} categorized as LIVE (explicit status)`);
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
  const validTournamentIds = ['pandascore_16836', 'pandascore_16673', 'pandascore_16652', 'pandascore_16651', 'pandascore_16650', 'pandascore_16649', 'faceit_faceit_championship_series', 'faceit_premier_league'];
  return validTournamentIds[Math.floor(Math.random() * validTournamentIds.length)];
};

// Helper for grouping matches by tournament/league with clickable links
function groupMatchesByLeague(matches: MatchInfo[]) {
  return matches.reduce((acc: Record<string, {
    matches: MatchInfo[];
    tournamentId?: string;
  }>, match) => {
    let league: string;

    // For PandaScore matches, combine league and tournament names
    if (match.source === 'professional' && match.league_name && match.tournament_name) {
      league = `${match.league_name} - ${match.tournament_name}`;
    } else {
      // Fallback to existing logic for other sources
      league = match.tournament_name || match.tournament || match.league_name || 'Unknown League';
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

const Index = () => {
  // Initialize with today's date (current date, not hardcoded)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedGameType, setSelectedGameType] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const { toast } = useToast();

  // Check if selected date is today
  const isSelectedDateToday = isToday(selectedDate);

  // Use the new optimized match counts hook
  const startDate = subMonths(selectedDate, 1);
  const endDate = addMonths(selectedDate, 1);
  const { counts: matchCountBreakdown, loading: loadingCalendar } = useMatchCounts(startDate, endDate, selectedGameType);
  const matchCounts = getTotalMatchCountsByDate(matchCountBreakdown);

  // Use the new optimized match cards hook  
  const { 
    cards: lightweightCards, 
    loading: loadingDateFiltered, 
    hasMore, 
    loadMore 
  } = useMatchCards({
    date: selectedDate,
    gameType: selectedGameType,
    statusFilter: selectedStatusFilter,
    sourceFilter: selectedSourceFilter
  });

  // Transform lightweight cards to MatchInfo format for compatibility
  const transformLightweightToMatchInfo = (card: any): MatchInfo => {
    return {
      id: `${card.source}_${card.match_id}`,
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
      esportType: card.esport_type,
      bestOf: card.best_of,
      source: card.source,
      status: card.status
    };
  };

  const allMatches = lightweightCards.map(transformLightweightToMatchInfo);

  // Categorize matches by status for display
  const liveMatches = allMatches.filter(match => {
    const category = match.source === 'amateur' 
      ? getFaceitStatusCategory(match.status || '', match.id, match.startTime) 
      : getPandaScoreStatusCategory(match.status || '', match.startTime);
    return category === 'live';
  });
  
  const upcomingMatches = allMatches.filter(match => {
    const category = match.source === 'amateur' 
      ? getFaceitStatusCategory(match.status || '', match.id, match.startTime) 
      : getPandaScoreStatusCategory(match.status || '', match.startTime);
    return category === 'upcoming';
  });
  
  const finishedMatches = allMatches.filter(match => {
    const category = match.source === 'amateur' 
      ? getFaceitStatusCategory(match.status || '', match.id, match.startTime) 
      : getPandaScoreStatusCategory(match.status || '', match.startTime);
    return category === 'finished';
  });

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

  // Helper to extract numeric prize value for sorting
  const getPrizeValueFromMetadata = (metadata: any): number | null => {
    if (!metadata || metadata.prizePool == null) return null;
    const raw = metadata.prizePool;
    const value = typeof raw === 'string' ? parseInt(raw) : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  };

  // Helper to get tier value for sorting (tier "a" = 0, "b" = 1, etc.)
  const getTierValueFromMetadata = (metadata: any): number => {
    if (!metadata || !metadata.tier) return 999; // Unknown tiers go to end
    const tier = metadata.tier.toLowerCase();
    if (tier === 'a') return 0;
    if (tier === 'b') return 1;
    if (tier === 'c') return 2;
    if (tier === 'd') return 3;
    if (tier === 's') return -1; // S tier goes first if it exists
    return 999; // Unknown tiers go to end
  };

  // Helper function to render tournament metadata
  const renderTournamentMetadata = (metadata: any) => {
    if (!metadata) return null;
    const items = [];

    // Prize pool
    if (metadata.prizePool) {
      const formattedPrize = formatPrizePool(metadata.prizePool);
      if (formattedPrize) {
        items.push(<span key="prize" className="flex items-center gap-1 text-xs text-green-400 font-medium">
            <Trophy size={12} />
            {formattedPrize}
          </span>);
      }
    }

    // Tournament tier
    if (metadata.tier && metadata.tier !== 'unranked') {
      items.push(<span key="tier" className="text-xs text-blue-400 font-medium uppercase">
          {metadata.tier}
        </span>);
    }

    // Serie info for PandaScore
    if (metadata.serieInfo) {
      const { year, season } = metadata.serieInfo;
      if (year || season) {
        items.push(<span key="serie" className="text-xs text-purple-400 font-medium">
            {year && season ? `${year} ${season}` : year || season}
          </span>);
      }
    }

    // FACEIT specific info
    if (metadata.region) {
      items.push(<span key="region" className="text-xs text-orange-400 font-medium uppercase">
          {metadata.region}
        </span>);
    }
    if (metadata.competitionType && metadata.competitionType !== 'Matchmaking') {
      items.push(<span key="compType" className="text-xs text-yellow-400 font-medium">
          {metadata.competitionType}
        </span>);
    }
    return items.length > 0 ? <div className="flex items-center justify-center gap-2 ml-2 mt-1">
        {items}
      </div> : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <SearchableNavbar />
      
      {/* Hero Section */}
      <Hero />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Esports Logo Filter */}
        <EsportsLogoFilter
          selectedGameType={selectedGameType}
          onGameTypeChange={setSelectedGameType}
        />

        {/* Filter Pills */}
        <FilterPills
          gameType={selectedGameType}
          statusFilter={selectedStatusFilter}
          sourceFilter={selectedSourceFilter}
          onGameTypeChange={setSelectedGameType}
          onStatusFilterChange={setSelectedStatusFilter}
          onSourceFilterChange={setSelectedSourceFilter}
        />

        {/* Date Picker */}
        <div className="mb-8">
          <DateMatchPicker
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            matchCounts={matchCounts}
            detailedMatchCounts={matchCountBreakdown}
          />
        </div>

        {/* Match Results */}
        <div className="space-y-8">
          {loadingDateFiltered ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading matches for {format(selectedDate, 'MMM d, yyyy')}...</p>
            </div>
          ) : lightweightCards.length === 0 ? (
            <div className="text-center py-12">
              <Gamepad2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No matches found</h3>
              <p className="text-muted-foreground mb-6">
                No matches were found for {format(selectedDate, 'MMM d, yyyy')} with the current filters.
              </p>
              <Button
                onClick={() => {
                  setSelectedGameType('all');
                  setSelectedStatusFilter('all');
                  setSelectedSourceFilter('all');
                }}
                variant="outline"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              {/* Live Matches Section */}
              {liveMatches.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                      <h2 className="text-2xl font-bold text-foreground">Live Matches</h2>
                    </div>
                    <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                      {liveMatches.length}
                    </Badge>
                  </div>
                  
                  {Object.entries(groupMatchesByLeague(liveMatches))
                    .sort(([, a], [, b]) => {
                      const metadataA = getTournamentMetadata(a.matches);
                      const metadataB = getTournamentMetadata(b.matches);
                      const tierA = getTierValueFromMetadata(metadataA);
                      const tierB = getTierValueFromMetadata(metadataB);
                      if (tierA !== tierB) return tierA - tierB;
                      const prizeA = getPrizeValueFromMetadata(metadataA) || 0;
                      const prizeB = getPrizeValueFromMetadata(metadataB) || 0;
                      return prizeB - prizeA;
                    })
                    .map(([league, { matches, tournamentId }]) => {
                      const metadata = getTournamentMetadata(matches);
                      return (
                        <div key={league} className="mb-6">
                          <div className="flex items-center justify-between mb-3">
                            <Link
                              to={`/tournament/${tournamentId}`}
                              className="flex items-center gap-2 hover:text-primary transition-colors"
                            >
                              <h3 className="text-lg font-semibold text-foreground">{league}</h3>
                              <Trophy className="h-4 w-4 text-muted-foreground" />
                            </Link>
                            {renderTournamentMetadata(metadata)}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {matches.map((match) => (
                              <OptimizedMatchCard key={match.id} card={lightweightCards.find(c => `${c.source}_${c.match_id}` === match.id)!} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </section>
              )}

              {/* Upcoming Matches Section */}
              {upcomingMatches.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <h2 className="text-2xl font-bold text-foreground">Upcoming Matches</h2>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {upcomingMatches.length}
                    </Badge>
                  </div>
                  
                  {Object.entries(groupMatchesByLeague(upcomingMatches))
                    .sort(([, a], [, b]) => {
                      const metadataA = getTournamentMetadata(a.matches);
                      const metadataB = getTournamentMetadata(b.matches);
                      const tierA = getTierValueFromMetadata(metadataA);
                      const tierB = getTierValueFromMetadata(metadataB);
                      if (tierA !== tierB) return tierA - tierB;
                      const prizeA = getPrizeValueFromMetadata(metadataA) || 0;
                      const prizeB = getPrizeValueFromMetadata(metadataB) || 0;
                      return prizeB - prizeA;
                    })
                    .map(([league, { matches, tournamentId }]) => {
                      const metadata = getTournamentMetadata(matches);
                      return (
                        <div key={league} className="mb-6">
                          <div className="flex items-center justify-between mb-3">
                            <Link
                              to={`/tournament/${tournamentId}`}
                              className="flex items-center gap-2 hover:text-primary transition-colors"
                            >
                              <h3 className="text-lg font-semibold text-foreground">{league}</h3>
                              <Trophy className="h-4 w-4 text-muted-foreground" />
                            </Link>
                            {renderTournamentMetadata(metadata)}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {matches.map((match) => (
                              <OptimizedMatchCard key={match.id} card={lightweightCards.find(c => `${c.source}_${c.match_id}` === match.id)!} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </section>
              )}

              {/* Finished Matches Section */}
              {finishedMatches.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <h2 className="text-2xl font-bold text-foreground">Finished Matches</h2>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      {finishedMatches.length}
                    </Badge>
                  </div>
                  
                  {Object.entries(groupMatchesByLeague(finishedMatches))
                    .sort(([, a], [, b]) => {
                      const metadataA = getTournamentMetadata(a.matches);
                      const metadataB = getTournamentMetadata(b.matches);
                      const tierA = getTierValueFromMetadata(metadataA);
                      const tierB = getTierValueFromMetadata(metadataB);
                      if (tierA !== tierB) return tierA - tierB;
                      const prizeA = getPrizeValueFromMetadata(metadataA) || 0;
                      const prizeB = getPrizeValueFromMetadata(metadataB) || 0;
                      return prizeB - prizeA;
                    })
                    .map(([league, { matches, tournamentId }]) => {
                      const metadata = getTournamentMetadata(matches);
                      return (
                        <div key={league} className="mb-6">
                          <div className="flex items-center justify-between mb-3">
                            <Link
                              to={`/tournament/${tournamentId}`}
                              className="flex items-center gap-2 hover:text-primary transition-colors"
                            >
                              <h3 className="text-lg font-semibold text-foreground">{league}</h3>
                              <Trophy className="h-4 w-4 text-muted-foreground" />
                            </Link>
                            {renderTournamentMetadata(metadata)}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {matches.map((match) => (
                              <OptimizedMatchCard key={match.id} card={lightweightCards.find(c => `${c.source}_${c.match_id}` === match.id)!} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </section>
              )}

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <Button onClick={loadMore} variant="outline">
                    Load More Matches
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Live Data Test Panel - Only in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-12">
            <LiveDataTestPanel />
          </div>
        )}

        {/* Sync Buttons - Only in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Development Tools</h3>
            <div className="flex gap-4">
              <FaceitSyncButtons />
              <PandaScoreSyncButtons />
            </div>
          </div>
        )}

        {/* SEO Content Block */}
        <div className="mt-16">
          <SEOContentBlock 
            title="Esports Match Tracking"
            paragraphs={[
              "Track live and upcoming esports matches across multiple games and platforms.",
              "Get real-time updates on professional tournaments and amateur competitions."
            ]}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;