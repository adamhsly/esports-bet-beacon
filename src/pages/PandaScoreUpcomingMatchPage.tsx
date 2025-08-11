import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import MatchVotingWidget from '@/components/MatchVotingWidget';
import { PandaScoreMatchHeader } from '@/components/match-details/PandaScoreMatchHeader';
import { PandaScoreFinishedMatchHeader } from '@/components/match-details/PandaScoreFinishedMatchHeader';
import { PandaScoreLiveMatchHeader } from '@/components/match-details/PandaScoreLiveMatchHeader';
import { PandaScoreCompactMatchHeader } from '@/components/match-details/PandaScoreCompactMatchHeader';
import { PandaScorePlayerRoster } from '@/components/match-details/PandaScorePlayerRoster';

import { PandaScorePreMatchStats } from '@/components/match-details/PandaScorePreMatchStats';

import { EnhancedTeamComparison } from '@/components/EnhancedTeamComparison';
import { fetchSupabasePandaScoreMatchDetails } from '@/lib/supabasePandaScoreApi';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useMobile } from '@/hooks/useMobile';
import { StreamViewer, extractStreamsFromRawData } from "@/components/StreamViewer";

// Helper function to determine header type with time-based logic
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

const PandaScoreUpcomingMatchPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const isMobile = useMobile();
  
  console.log('🎮 PandaScore Match Page - Raw Match ID from URL:', matchId);
  
  const { data: matchDetails, isLoading, error } = useQuery({
    queryKey: ['pandascore-match-details', matchId],
    queryFn: async () => {
      if (!matchId) throw new Error('No match ID provided');
      
      // Ensure we're working with the clean match ID for database query
      const cleanMatchId = matchId.startsWith('pandascore_') ? matchId : `pandascore_${matchId}`;
      console.log(`🔍 Fetching PandaScore match details - URL ID: ${matchId}, Clean ID: ${cleanMatchId}`);
      
      const match = await fetchSupabasePandaScoreMatchDetails(cleanMatchId);
      
      if (!match) {
        throw new Error('PandaScore match not found in database');
      }
      
      console.log('✅ PandaScore match details retrieved from database:', {
        matchId: match.match_id,
        esportType: match.esport_type,
        team1: { name: match.teams[0]?.name, playerCount: match.teams[0]?.players?.length || 0 },
        team2: { name: match.teams[1]?.name, playerCount: match.teams[1]?.players?.length || 0 }
      });
      return match;
    },
    enabled: !!matchId,
    staleTime: 30000,
    retry: 1
  });

  useEffect(() => {
    if (error) {
      console.error('❌ Error loading PandaScore match details:', error);
      toast({
        title: "Error loading match details",
        description: "We couldn't load the PandaScore match information from the database.",
        variant: "destructive",
      });
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-2 py-4 flex justify-center items-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-400 mx-auto mb-4" />
            <span className="text-lg">Loading PandaScore match details...</span>
            <p className="text-sm text-gray-400 mt-2">Fetching pro match data from database</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!matchDetails) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-2 py-4">
          <div className="text-center py-20">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-xl text-gray-400 mb-2">PandaScore match details not found.</p>
            <p className="text-sm text-gray-500">The match may not be in our database or the ID is invalid.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Determine which header to render based on match status and time
  const headerType = getHeaderType(matchDetails.status, matchDetails.startTime);
  console.log(`🎯 Rendering ${headerType} header for match ${matchId} with status: ${matchDetails.status}`);

  const renderMatchHeader = () => {
    // For mobile, use compact header that handles all states
    if (isMobile) {
      return <PandaScoreCompactMatchHeader match={matchDetails} isMobile={true} />;
    }

    // For desktop, use specific headers for each state
    switch (headerType) {
      case 'finished':
        return <PandaScoreFinishedMatchHeader match={matchDetails} />;
      case 'live':
        return <PandaScoreLiveMatchHeader match={matchDetails} />;
      case 'upcoming':
      default:
        return <PandaScoreMatchHeader match={matchDetails} />;
    }
  };

  // --- Extract streams from rawData ---
  const streams = extractStreamsFromRawData(matchDetails.rawData);
  const hasStreams = streams && streams.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />

      <div className="flex-grow max-w-5xl mx-auto w-full px-2 md:px-8 py-2 md:py-8">
        <div className="space-y-4 md:space-y-8">
          {error && (
            <Alert className="bg-yellow-500/10 border-yellow-500/30">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-yellow-400">
                Some data may be incomplete. Displaying available information from our database.
              </AlertDescription>
            </Alert>
          )}

          {/* Dynamic Match Header based on status */}
          {renderMatchHeader()}

          {/* StreamViewer widget for non-finished matches */}
          {hasStreams && headerType !== 'finished' && (
            <Card className="bg-theme-gray-dark border border-theme-gray-medium">
              <div className="p-4">
                <h3 className="text-lg font-bold text-white mb-4">Match Streams</h3>
                <StreamViewer streams={streams} showTabs={false} />
                <p className="text-xs text-gray-400 mt-2">
                  Streams will be available closer to match time. Check back before the match starts!
                </p>
              </div>
            </Card>
          )}


          {/* Pre-Match Stats */}
          <Card className="bg-theme-gray-dark border border-theme-gray-medium">
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-4">Pre-Match Statistics</h3>
              <PandaScorePreMatchStats
                teams={matchDetails.teams}
                tournament={matchDetails.tournament}
                esportType={matchDetails.esport_type}
                matchId={matchDetails.match_id}
              />
            </div>
          </Card>

          {/* Community Predictions for upcoming matches */}
          {headerType === 'upcoming' && (
            <Card className="bg-theme-gray-dark border border-theme-gray-medium">
              <div className="p-4">
                <h3 className="text-lg font-bold text-white mb-4">Community Predictions</h3>
                <MatchVotingWidget
                  matchId={matchDetails.id}
                  teams={[
                    {
                      id: matchDetails.teams[0]?.id || 'team1',
                      name: matchDetails.teams[0]?.name || 'Team 1',
                      logo: matchDetails.teams[0]?.logo || '/placeholder.svg'
                    },
                    {
                      id: matchDetails.teams[1]?.id || 'team2',
                      name: matchDetails.teams[1]?.name || 'Team 2',
                      logo: matchDetails.teams[1]?.logo || '/placeholder.svg'
                    }
                  ]}
                />
              </div>
            </Card>
          )}

          {/* Team Rosters */}
          <Card className="bg-theme-gray-dark border border-theme-gray-medium">
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-4">Team Rosters</h3>
              <PandaScorePlayerRoster 
                teams={matchDetails.teams}
                esportType={matchDetails.esport_type}
              />
            </div>
          </Card>

          {/* Team Analysis */}
          <Card className="bg-theme-gray-dark border border-theme-gray-medium">
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-4">Team Analysis</h3>
              <EnhancedTeamComparison
                team1Id={matchDetails.teams[0]?.id || ''}
                team2Id={matchDetails.teams[1]?.id || ''}
                esportType={matchDetails.esport_type}
              />
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PandaScoreUpcomingMatchPage;
