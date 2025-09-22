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
import { MatchCountBreakdown } from '@/utils/matchCountUtils';
import { startOfDay, endOfDay, isToday, subMonths, addMonths, format } from 'date-fns';
import { isDateInRange, getMostRecentMatchDate } from '@/utils/timezoneUtils';
import { FilterPills } from '@/components/FilterPills';
import { EsportsLogoFilter } from '@/components/EsportsLogoFilter';
import { DateMatchPicker } from '@/components/DateMatchPicker';
import { useMatchCounts } from '@/hooks/useMatchCounts';
import { useMatchCards } from '@/hooks/useMatchCards';

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

  // 🚀 OPTIMIZED: Use new hooks for fast data fetching
  const { 
    matchCounts, 
    detailedMatchCounts, 
    loading: loadingCalendar,
    error: calendarError 
  } = useMatchCounts(selectedDate);

  const {
    liveMatches: dateFilteredLiveMatches,
    upcomingMatches: dateFilteredUpcomingMatches,
    finishedMatches: dateFilteredFinishedMatches,
    loading: loadingDateFiltered,
    error: cardsError
  } = useMatchCards(selectedDate, selectedGameType, selectedStatusFilter, selectedSourceFilter);

  // Check if selected date is today
  const isSelectedDateToday = isToday(selectedDate);

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
      const {
        year,
        season
      } = metadata.serieInfo;
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

  // 🚀 OPTIMIZED: Error handling for the new hooks
  useEffect(() => {
    if (calendarError) {
      toast({
        title: 'Error loading calendar data',
        description: calendarError,
        variant: 'destructive'
      });
    }
  }, [calendarError, toast]);

  useEffect(() => {
    if (cardsError) {
      toast({
        title: 'Error loading matches',
        description: cardsError,
        variant: 'destructive'
      });
    }
  }, [cardsError, toast]);

  // Helper function to apply all filters at once
  const applyStatusFilter = (matches: MatchInfo[]) => {
    console.log(`🔍 Applying status filter: ${selectedStatusFilter} to ${matches.length} matches`);
    if (selectedStatusFilter === 'all') {
      console.log(`🔍 All statuses selected, returning all ${matches.length} matches`);
      return matches;
    }
    const filtered = matches.filter(match => {
      // Map database statuses to filter categories
      const normalizedStatus = (match.status || '').toLowerCase();
      if (selectedStatusFilter === 'live') {
        return ['ongoing', 'running', 'live'].includes(normalizedStatus);
      } else if (selectedStatusFilter === 'upcoming') {
        return ['upcoming', 'ready', 'scheduled', 'configured', 'not_started'].includes(normalizedStatus);
      } else if (selectedStatusFilter === 'finished') {
        return ['finished', 'completed', 'cancelled', 'aborted', 'canceled', 'postponed', 'forfeit'].includes(normalizedStatus);
      }
      return true;
    });
    console.log(`🔍 Status filter result: ${filtered.length} matches after filtering for ${selectedStatusFilter}`);
    return filtered;
  };

  const applySourceFilter = (matches: MatchInfo[]) => {
    console.log(`🔍 Applying source filter: ${selectedSourceFilter} to ${matches.length} matches`);
    if (selectedSourceFilter === 'all') {
      console.log(`🔍 All sources selected, returning all ${matches.length} matches`);
      return matches;
    }
    const filtered = matches.filter(match => {
      if (selectedSourceFilter === 'professional') {
        return match.source === 'professional';
      } else if (selectedSourceFilter === 'amateur') {
        return match.source === 'amateur';
      }
      return true;
    });
    console.log(`🔍 Source filter result: ${filtered.length} matches after filtering for ${selectedSourceFilter}`);
    return filtered;
  };

  // Group live matches by league/tournament
  const groupedLiveMatches = groupMatchesByLeague(dateFilteredLiveMatches);
  const sortedLiveKeys = Object.keys(groupedLiveMatches).sort((a, b) => {
    const metadataA = getTournamentMetadata(groupedLiveMatches[a].matches);
    const metadataB = getTournamentMetadata(groupedLiveMatches[b].matches);
    const tierA = getTierValueFromMetadata(metadataA);
    const tierB = getTierValueFromMetadata(metadataB);
    if (tierA !== tierB) return tierA - tierB;
    const prizeA = getPrizeValueFromMetadata(metadataA) || 0;
    const prizeB = getPrizeValueFromMetadata(metadataB) || 0;
    return prizeB - prizeA;
  });

  // Group upcoming matches by league/tournament
  const groupedUpcomingMatches = groupMatchesByLeague(dateFilteredUpcomingMatches);
  const sortedUpcomingKeys = Object.keys(groupedUpcomingMatches).sort((a, b) => {
    const metadataA = getTournamentMetadata(groupedUpcomingMatches[a].matches);
    const metadataB = getTournamentMetadata(groupedUpcomingMatches[b].matches);
    const tierA = getTierValueFromMetadata(metadataA);
    const tierB = getTierValueFromMetadata(metadataB);
    if (tierA !== tierB) return tierA - tierB;
    const prizeA = getPrizeValueFromMetadata(metadataA) || 0;
    const prizeB = getPrizeValueFromMetadata(metadataB) || 0;
    return prizeB - prizeA;
  });

  // Group finished matches by league/tournament
  const groupedFinishedMatches = groupMatchesByLeague(dateFilteredFinishedMatches);
  const sortedFinishedKeys = Object.keys(groupedFinishedMatches).sort((a, b) => {
    const metadataA = getTournamentMetadata(groupedFinishedMatches[a].matches);
    const metadataB = getTournamentMetadata(groupedFinishedMatches[b].matches);
    const tierA = getTierValueFromMetadata(metadataA);
    const tierB = getTierValueFromMetadata(metadataB);
    if (tierA !== tierB) return tierA - tierB;
    const prizeA = getPrizeValueFromMetadata(metadataA) || 0;
    const prizeB = getPrizeValueFromMetadata(metadataB) || 0;
    return prizeB - prizeA;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      <SearchableNavbar />

      {/* Hero Section */}
      <Hero />

      {/* EsportsLogoFilter - now with selectedGameType state */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <EsportsLogoFilter selectedGameType={selectedGameType} onGameTypeChange={setSelectedGameType} />
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FilterPills 
          gameType={selectedGameType}
          statusFilter={selectedStatusFilter}
          sourceFilter={selectedSourceFilter}
          onGameTypeChange={setSelectedGameType}
          onStatusFilterChange={setSelectedStatusFilter}
          onSourceFilterChange={setSelectedSourceFilter}
        />
      </div>

      {/* Date picker with counts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <DateMatchPicker
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          matchCounts={matchCounts}
          detailedMatchCounts={detailedMatchCounts}
        />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingDateFiltered ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-theme-purple" />
            <span className="ml-2 text-lg">Loading matches...</span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Live Matches */}
            {sortedLiveKeys.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                  <h2 className="text-2xl font-bold text-red-400 flex items-center gap-2">
                    Live Matches ({dateFilteredLiveMatches.length})
                  </h2>
                </div>
                <div className="space-y-6">
                  {sortedLiveKeys.map(league => {
                    const group = groupedLiveMatches[league];
                    const metadata = getTournamentMetadata(group.matches);
                    return (
                      <div key={league} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Link
                            to={`/tournaments/${group.tournamentId}`}
                            className="group hover:text-theme-purple transition-colors"
                          >
                            <h3 className="text-lg font-semibold text-white group-hover:text-theme-purple transition-colors flex items-center gap-2">
                              {league}
                              <span className="opacity-60">({group.matches.length})</span>
                            </h3>
                            {renderTournamentMetadata(metadata)}
                          </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {group.matches.map(match => (
                            <MatchCard key={match.id} match={match} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upcoming Matches */}
            {sortedUpcomingKeys.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="h-5 w-5 text-blue-400" />
                  <h2 className="text-2xl font-bold text-blue-400">
                    Upcoming Matches ({dateFilteredUpcomingMatches.length})
                  </h2>
                </div>
                <div className="space-y-6">
                  {sortedUpcomingKeys.map(league => {
                    const group = groupedUpcomingMatches[league];
                    const metadata = getTournamentMetadata(group.matches);
                    return (
                      <div key={league} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Link
                            to={`/tournaments/${group.tournamentId}`}
                            className="group hover:text-theme-purple transition-colors"
                          >
                            <h3 className="text-lg font-semibold text-white group-hover:text-theme-purple transition-colors flex items-center gap-2">
                              {league}
                              <span className="opacity-60">({group.matches.length})</span>
                            </h3>
                            {renderTournamentMetadata(metadata)}
                          </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {group.matches.map(match => (
                            <MatchCard key={match.id} match={match} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Finished Matches */}
            {sortedFinishedKeys.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <h2 className="text-2xl font-bold text-green-400">
                    Finished Matches ({dateFilteredFinishedMatches.length})
                  </h2>
                </div>
                <div className="space-y-6">
                  {sortedFinishedKeys.map(league => {
                    const group = groupedFinishedMatches[league];
                    const metadata = getTournamentMetadata(group.matches);
                    return (
                      <div key={league} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Link
                            to={`/tournaments/${group.tournamentId}`}
                            className="group hover:text-theme-purple transition-colors"
                          >
                            <h3 className="text-lg font-semibold text-white group-hover:text-theme-purple transition-colors flex items-center gap-2">
                              {league}
                              <span className="opacity-60">({group.matches.length})</span>
                            </h3>
                            {renderTournamentMetadata(metadata)}
                          </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {group.matches.map(match => (
                            <MatchCard key={match.id} match={match} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No matches message */}
            {!loadingDateFiltered && 
             dateFilteredLiveMatches.length === 0 && 
             dateFilteredUpcomingMatches.length === 0 && 
             dateFilteredFinishedMatches.length === 0 && (
              <div className="text-center py-12">
                <Gamepad2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No matches found</h3>
                <p className="text-gray-500">
                  Try adjusting your filters or selecting a different date.
                  {!isSelectedDateToday && " Consider viewing today's matches instead."}
                </p>
                {!isSelectedDateToday && (
                  <Button
                    onClick={() => setSelectedDate(new Date())}
                    variant="outline"
                    className="mt-4"
                  >
                    View Today's Matches
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SEO Content */}
      <SEOContentBlock 
        title="Comprehensive Esports Match Coverage"
        paragraphs={[
          "Welcome to the ultimate esports match tracking platform. We provide real-time coverage of professional and amateur matches across all major esports titles including Counter-Strike 2, League of Legends, Valorant, Dota 2, and many more.",
          "Our platform aggregates match data from multiple sources to give you the most comprehensive view of the esports scene. Whether you're following your favorite team or discovering new tournaments, we've got you covered with live scores, upcoming fixtures, and detailed match statistics.",
          "Stay up-to-date with the latest esports action and never miss an important match again. Our advanced filtering system allows you to customize your experience by game type, tournament tier, and match status."
        ]}
      />

      {/* Footer */}
      <Footer />

      {/* Development Test Panel */}
      {process.env.NODE_ENV === 'development' && <LiveDataTestPanel />}
    </div>
  );
};

export default Index;