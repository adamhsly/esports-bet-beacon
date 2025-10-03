import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Loader2, AlertTriangle, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import MatchVotingWidget from '@/components/MatchVotingWidget';
import { FaceitMatchHeader } from '@/components/match-details/FaceitMatchHeader';
import { FaceitFinishedMatchHeader } from '@/components/match-details/FaceitFinishedMatchHeader';
import { FaceitLiveMatchHeader } from '@/components/match-details/FaceitLiveMatchHeader';
import { FaceitCompactMatchHeader } from '@/components/match-details/FaceitCompactMatchHeader';
import { FaceitPlayerRoster } from '@/components/match-details/FaceitPlayerRoster';
import { FaceitMobilePlayerLineup } from '@/components/match-details/FaceitMobilePlayerLineup';
import { FaceitPreMatchStats } from '@/components/match-details/FaceitPreMatchStats';
import { FaceitPlayerLineupTable } from '@/components/match-details/FaceitPlayerLineupTable';
import { FaceitLiveScorecard } from '@/components/match-details/FaceitLiveScorecard';
import { FaceitLiveRoomAccess } from '@/components/match-details/FaceitLiveRoomAccess';
import { FaceitPlayerPerformanceTable } from '@/components/match-details/FaceitPlayerPerformanceTable';
import { FaceitLiveMatchDashboard } from '@/components/match-details/FaceitLiveMatchDashboard';
import { FaceitMatchAnalysis } from '@/components/match-details/FaceitMatchAnalysis';
import { fetchSupabaseFaceitMatchDetails } from '@/lib/supabaseFaceitApi';
import { fetchEnhancedFaceitMatchData } from '@/lib/faceitEnhancedApi';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useMobile } from '@/hooks/useMobile';

// Helper function to determine header type based on match status
const getHeaderType = (status: string, startTime?: string): 'finished' | 'live' | 'upcoming' => {
  const normalizedStatus = status?.toLowerCase() || '';

  // Finished match statuses (always respect finished status)
  if (['finished', 'completed', 'cancelled', 'aborted'].includes(normalizedStatus)) {
    return 'finished';
  }

  // Time-based live status determination
  if (startTime) {
    const now = new Date();
    const matchStart = new Date(startTime);
    const hasStarted = now >= matchStart;
    if (hasStarted && !['finished', 'completed', 'cancelled', 'aborted'].includes(normalizedStatus)) {
      return 'live';
    }
  }

  // Default live status fallback for explicit live statuses
  if (['ongoing', 'running', 'live'].includes(normalizedStatus)) {
    return 'live';
  }

  // Default to upcoming
  return 'upcoming';
};
const FaceitMatchPage = () => {
  const {
    matchId
  } = useParams<{
    matchId: string;
  }>();
  const isMobile = useMobile();
  console.log('🎮 FACEIT Match Page - Match ID:', matchId);

  // Use React Query to fetch FACEIT match details from database
  const {
    data: matchDetails,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['faceit-match-details', matchId],
    queryFn: async () => {
      if (!matchId) throw new Error('No match ID provided');
      console.log(`🔍 Fetching enhanced FACEIT match data for: ${matchId}`);

      // First try to fetch enhanced data
      const enhancedData = await fetchEnhancedFaceitMatchData(matchId);
      if (enhancedData) {
        console.log('✅ Enhanced FACEIT match data retrieved:', enhancedData);
        return enhancedData;
      }

      // Fallback to original method if enhanced data not available
      const match = await fetchSupabaseFaceitMatchDetails(matchId);
      if (!match) {
        throw new Error('FACEIT match not found in database');
      }
      console.log('✅ Basic FACEIT match details retrieved from database:', match);
      return {
        matchData: match,
        playerPerformances: [],
        roundResults: [],
        killFeed: []
      };
    },
    enabled: !!matchId,
    staleTime: 30000,
    retry: 1,
    refetchInterval: query => {
      // Auto-refresh live matches every 15 seconds for enhanced data
      if (query.state.data) {
        const matchStatus = (query.state.data as any).matchData?.status || (query.state.data as any).status;
        if (getHeaderType(matchStatus) === 'live') {
          return query.state.data.matchData?.autoRefreshInterval || 15000;
        }
      }
      return false;
    }
  });
  useEffect(() => {
    if (error) {
      console.error('❌ Error loading FACEIT match details:', error);
      toast({
        title: "Error loading match details",
        description: "We couldn't load the FACEIT match information from the database.",
        variant: "destructive"
      });
    }
  }, [error]);
  if (isLoading) {
    return <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-2 py-4 flex justify-center items-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-400 mx-auto mb-4" />
            <span className="text-lg">Loading FACEIT match details...</span>
            <p className="text-sm text-gray-400 mt-2">Fetching real data from database</p>
          </div>
        </div>
        <Footer />
      </div>;
  }
  if (!matchDetails) {
    return <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-2 py-4">
          <div className="text-center py-20">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-xl text-gray-400 mb-2">FACEIT match details not found.</p>
            <p className="text-sm text-gray-500">The match may not be in our database or the ID is invalid.</p>
          </div>
        </div>
        <Footer />
      </div>;
  }

  // Determine which header and content to render based on match status and time
  const matchData = matchDetails.matchData || matchDetails;
  const isEnhancedData = 'playerPerformances' in matchDetails;

  // Ensure teams data exists and is valid
  const safeTeams = matchData?.teams || [];
  const headerType = getHeaderType(matchData?.status, matchData?.startTime);
  console.log(`🎯 Rendering ${headerType} header for match ${matchId} with status: ${matchData?.status}`, {
    isEnhancedData,
    teamsCount: safeTeams.length
  });
  const renderMatchHeader = () => {
    // Use mobile-style compact header for all devices now
    if (headerType === 'finished') {
      return <FaceitFinishedMatchHeader match={{
        ...matchData,
        finishedTime: matchData.finished_at || matchData.startTime
      }} />;
    }

    // Use compact header for all devices
    return <FaceitCompactMatchHeader match={matchData} isMobile={false} />;
  };
  const renderMainContent = () => {
    // Enhanced live match dashboard for live matches with enhanced data
    if (headerType === 'live' && isEnhancedData && matchDetails.matchData?.livePlayerStatus) {
      const liveMatchData = {
        matchId: matchData.match_id || matchData.id,
        currentRound: matchDetails.matchData.currentRound || 0,
        roundTimer: matchDetails.matchData.roundTimer || 0,
        matchPhase: matchDetails.matchData.matchPhase as any || 'live',
        teamScores: matchDetails.matchData.liveTeamScores || {
          faction1: 0,
          faction2: 0
        },
        playerStatus: matchDetails.matchData.livePlayerStatus || {},
        killFeed: matchDetails.killFeed?.slice(-10).map(kill => ({
          id: `${kill.matchId}-${kill.roundNumber}-${kill.timestamp}`,
          killer: kill.killerNickname,
          victim: kill.victimNickname,
          weapon: kill.weapon,
          headshot: kill.headshot,
          timestamp: kill.timestamp
        })) || [],
        bombStatus: (matchDetails as any).liveStats?.bombStatus || 'none',
        bombTimer: (matchDetails as any).liveStats?.bombTimer,
        autoRefreshInterval: matchDetails.matchData.autoRefreshInterval || 15000
      };
      const teams = safeTeams?.map((team: any, index: number) => ({
        name: team.name,
        logo: team.logo || team.avatar,
        faction: index === 0 ? 'faction1' as const : 'faction2' as const,
        roster: team.roster
      })) || [];
      return <div className="space-y-4">
          <FaceitLiveMatchDashboard matchData={liveMatchData} teams={teams} onRefresh={refetch} />
        </div>;
    }

    // Enhanced match analysis for finished matches with comprehensive data
    if (headerType === 'finished' && isEnhancedData) {
      const teams = safeTeams?.map((team: any, index: number) => ({
        name: team.name,
        logo: team.logo || team.avatar,
        faction: index === 0 ? 'faction1' as const : 'faction2' as const
      })) || [];
      const mapResults = matchDetails.matchData?.mapsPlayed || [];
      const matchResult = matchData.faceitData?.results ? {
        winnerFaction: matchData.faceitData.results.winner === 'faction1' ? 'faction1' as const : 'faction2' as const,
        finalScore: matchData.faceitData.results.score || {
          faction1: 0,
          faction2: 0
        }
      } : undefined;

      // Check if this is a bye/walkover match
      const isByeMatch = teams.some(team => team.name?.toLowerCase() === 'bye');
      if (isByeMatch || matchDetails.playerPerformances?.length === 0) {
        return <div className="space-y-4">
          <Card className="bg-card border border-border">
              
            </Card>
          </div>;
      }
      return <div className="space-y-4">
          <FaceitMatchAnalysis matchId={matchData.match_id || matchData.id} teams={teams} playerPerformances={matchDetails.playerPerformances} roundResults={matchDetails.roundResults} mapResults={mapResults} matchResult={matchResult} />
        </div>;
    }

    // Fallback to original layout for basic data or upcoming matches
    return <div className="space-y-4">
        {/* Live scorecard for live matches */}
        {headerType === 'live' && <FaceitLiveScorecard match={matchData} />}
        
        {/* Pre-Match Stats for all match types */}
        {safeTeams.length > 0 && <FaceitPreMatchStats teams={safeTeams} faceitData={matchData.faceitData} />}
        
        {/* Community Voting for upcoming matches */}
        {headerType === 'upcoming' && safeTeams.length >= 2 && <Card className="bg-card border border-border">
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-4">Community Predictions</h3>
              <MatchVotingWidget matchId={matchData?.id || matchData?.match_id} teams={[{
            id: safeTeams[0]?.id || safeTeams[0]?.faction_id || 'team1',
            name: safeTeams[0]?.name || 'Team 1',
            logo: safeTeams[0]?.logo || safeTeams[0]?.avatar || '/placeholder.svg'
          }, {
            id: safeTeams[1]?.id || safeTeams[1]?.faction_id || 'team2',
            name: safeTeams[1]?.name || 'Team 2',
            logo: safeTeams[1]?.logo || safeTeams[1]?.avatar || '/placeholder.svg'
          }]} />
            </div>
          </Card>}

        {/* Live Room Access for live matches */}
        {headerType === 'live' && safeTeams.length > 0 && <Card className="bg-card border border-border">
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-4">Match Room Access</h3>
              <FaceitLiveRoomAccess matchId={matchData?.id || matchData?.match_id} teams={safeTeams} status="live" />
            </div>
          </Card>}

        {/* Player Performance for finished matches */}
        {headerType === 'finished' && safeTeams.length > 0 && <Card className="bg-card border border-border">
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-4">Player Performance</h3>
              <FaceitPlayerPerformanceTable teams={safeTeams} matchResult={matchData?.faceitData?.results} />
            </div>
          </Card>}

      </div>;
  };
  return <div className="min-h-screen flex flex-col bg-theme-gray-dark theme-alt-card">
      <SearchableNavbar />

      <div className="flex-grow max-w-5xl mx-auto w-full px-2 md:px-8 py-2 md:py-8">
        <div className="space-y-4 md:space-y-8">
          {/* Error Alert if there were issues */}
          {error && <Alert className="bg-yellow-500/10 border-yellow-500/30">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-yellow-400">
                Some data may be incomplete. Displaying available information from our database.
              </AlertDescription>
            </Alert>}

          {/* Dynamic Match Header based on status */}
          {renderMatchHeader()}
          
          {/* Player Lineup - Use mobile-optimized component for all devices */}
          {safeTeams.length > 0 && (isMobile ? <FaceitMobilePlayerLineup teams={safeTeams} /> : <FaceitPlayerLineupTable teams={safeTeams} />)}
          
          {/* Main Content - Card-based layout for all devices */}
          {renderMainContent()}
        </div>
      </div>
      
      <Footer />
    </div>;
};
export default FaceitMatchPage;