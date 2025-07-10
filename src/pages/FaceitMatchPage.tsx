
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
import { fetchSupabaseFaceitMatchDetails } from '@/lib/supabaseFaceitApi';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useMobile } from '@/hooks/useMobile';

// Helper function to determine header type based on match status
const getHeaderType = (status: string): 'finished' | 'live' | 'upcoming' => {
  const normalizedStatus = status?.toLowerCase() || '';
  
  // Finished match statuses
  if (['finished', 'completed', 'cancelled', 'aborted'].includes(normalizedStatus)) {
    return 'finished';
  }
  
  // Live match statuses
  if (['ongoing', 'running', 'live'].includes(normalizedStatus)) {
    return 'live';
  }
  
  // Default to upcoming
  return 'upcoming';
};

const FaceitMatchPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const isMobile = useMobile();
  
  console.log('🎮 FACEIT Match Page - Match ID:', matchId);
  
  // Use React Query to fetch FACEIT match details from database
  const { data: matchDetails, isLoading, error, refetch } = useQuery({
    queryKey: ['faceit-match-details', matchId],
    queryFn: async () => {
      if (!matchId) throw new Error('No match ID provided');
      
      console.log(`🔍 Fetching FACEIT match details from database for: ${matchId}`);
      const match = await fetchSupabaseFaceitMatchDetails(matchId);
      
      if (!match) {
        throw new Error('FACEIT match not found in database');
      }
      
      console.log('✅ FACEIT match details retrieved from database:', match);
      return match;
    },
    enabled: !!matchId,
    staleTime: 30000,
    retry: 1,
    refetchInterval: (query) => {
      // Auto-refresh live matches every 30 seconds
      if (query.state.data && getHeaderType(query.state.data.status) === 'live') {
        return 30000;
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
            <span className="text-lg">Loading FACEIT match details...</span>
            <p className="text-sm text-gray-400 mt-2">Fetching real data from database</p>
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
            <p className="text-xl text-gray-400 mb-2">FACEIT match details not found.</p>
            <p className="text-sm text-gray-500">The match may not be in our database or the ID is invalid.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Determine which header and content to render based on match status
  const headerType = getHeaderType(matchDetails.status);
  console.log(`🎯 Rendering ${headerType} header for match ${matchId} with status: ${matchDetails.status}`);

  const renderMatchHeader = () => {
    // For finished matches, always use the full finished header to show scores and winners
    if (headerType === 'finished') {
      return <FaceitFinishedMatchHeader match={{
        ...matchDetails,
        finishedTime: matchDetails.finished_at || matchDetails.startTime
      }} />;
    }

    // For mobile non-finished matches, use compact header
    if (isMobile) {
      return <FaceitCompactMatchHeader match={matchDetails} isMobile={true} />;
    }

    // Desktop headers for live and upcoming matches
    switch (headerType) {
      case 'live':
        return <FaceitLiveMatchHeader match={matchDetails} />;
      case 'upcoming':
      default:
        return <FaceitMatchHeader match={matchDetails} />;
    }
  };

  const renderMainContent = () => {
    if (isMobile) {
      return (
        <div className="space-y-4">
          {/* Live scorecard for live matches */}
          {headerType === 'live' && (
            <FaceitLiveScorecard match={matchDetails} />
          )}
          
          {/* Pre-Match Stats for upcoming/finished */}
          <FaceitPreMatchStats 
            teams={matchDetails.teams}
            faceitData={matchDetails.faceitData}
          />
          
          {/* Community Voting for upcoming matches */}
          {headerType === 'upcoming' && (
            <Card className="bg-theme-gray-dark border-theme-gray-medium">
              <div className="p-2">
                <h3 className="text-sm font-bold text-white mb-2">Community Predictions</h3>
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
        </div>
      );
    }

    // Desktop tabs based on match status
    const getTabsForStatus = () => {
      switch (headerType) {
        case 'live':
          return (
            <Tabs defaultValue="live" className="w-full">
              <TabsList className="bg-theme-gray-dark border border-theme-gray-light w-full flex justify-start p-1 mb-8">
                <TabsTrigger value="live" className="data-[state=active]:bg-red-500 data-[state=active]:text-white py-2 px-4">
                  Live Match
                </TabsTrigger>
                <TabsTrigger value="rosters" className="data-[state=active]:bg-red-500 data-[state=active]:text-white py-2 px-4">
                  Team Rosters
                </TabsTrigger>
                <TabsTrigger value="room" className="data-[state=active]:bg-red-500 data-[state=active]:text-white py-2 px-4">
                  Match Room
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="live" className="space-y-8">
                <FaceitLiveScorecard match={matchDetails} />
              </TabsContent>
              
              <TabsContent value="rosters">
                <FaceitPlayerRoster teams={matchDetails.teams} />
              </TabsContent>
              
              <TabsContent value="room">
                <FaceitLiveRoomAccess 
                  matchId={matchDetails.id}
                  teams={matchDetails.teams}
                  status="live"
                />
              </TabsContent>
            </Tabs>
          );

        case 'finished':
          return (
            <Tabs defaultValue="results" className="w-full">
              <TabsList className="bg-theme-gray-dark border border-theme-gray-light w-full flex justify-start p-1 mb-8">
                <TabsTrigger value="results" className="data-[state=active]:bg-green-500 data-[state=active]:text-white py-2 px-4">
                  Match Results
                </TabsTrigger>
                <TabsTrigger value="performance" className="data-[state=active]:bg-green-500 data-[state=active]:text-white py-2 px-4">
                  Player Performance
                </TabsTrigger>
                <TabsTrigger value="rosters" className="data-[state=active]:bg-green-500 data-[state=active]:text-white py-2 px-4">
                  Team Rosters
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="results" className="space-y-8">
                <FaceitPreMatchStats 
                  teams={matchDetails.teams}
                  faceitData={matchDetails.faceitData}
                />
              </TabsContent>
              
              <TabsContent value="performance">
                <FaceitPlayerPerformanceTable 
                  teams={matchDetails.teams} 
                  matchResult={matchDetails.faceitData?.results}
                />
              </TabsContent>
              
              <TabsContent value="rosters">
                <FaceitPlayerRoster teams={matchDetails.teams} />
              </TabsContent>
            </Tabs>
          );

        case 'upcoming':
        default:
          return (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-theme-gray-dark border border-theme-gray-light w-full flex justify-start p-1 mb-8">
                <TabsTrigger value="overview" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white py-2 px-4">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="rosters" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white py-2 px-4">
                  Team Rosters
                </TabsTrigger>
                <TabsTrigger value="stats" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white py-2 px-4">
                  Pre-Match Analysis
                </TabsTrigger>
                <TabsTrigger value="voting" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white py-2 px-4">
                  Community Vote
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-8">
                <FaceitPreMatchStats 
                  teams={matchDetails.teams}
                  faceitData={matchDetails.faceitData}
                />
              </TabsContent>
              
              <TabsContent value="rosters">
                <FaceitPlayerRoster teams={matchDetails.teams} />
              </TabsContent>
              
              <TabsContent value="stats">
                <FaceitPreMatchStats 
                  teams={matchDetails.teams}
                  faceitData={matchDetails.faceitData}
                />
              </TabsContent>
              
              <TabsContent value="voting">
                <div className="space-y-8">
                  <h3 className="text-xl font-bold text-white">Community Predictions</h3>
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
              </TabsContent>
            </Tabs>
          );
      }
    };

    return getTabsForStatus();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />

      <div className={`flex-grow w-full`}>
        <div className={`max-w-5xl mx-auto w-full px-2 md:px-8 ${isMobile ? 'py-2' : 'py-8'}`}>
          <div className={`space-y-${isMobile ? '4' : '8'}`}>
            {/* Error Alert if there were issues */}
            {error && (
              <div className="px-2 md:px-8">
                <Alert className="bg-yellow-500/10 border-yellow-500/30">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-yellow-400">
                    Some data may be incomplete. Displaying available information from our database.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Dynamic Match Header based on status */}
            <div className="px-2 md:px-8">
              {renderMatchHeader()}
            </div>
            
            {/* Player Lineup - Use mobile-optimized component on mobile */}
            <div className="px-2 md:px-8">
              {isMobile ? (
                <FaceitMobilePlayerLineup teams={matchDetails.teams} />
              ) : (
                <FaceitPlayerLineupTable teams={matchDetails.teams} />
              )}
            </div>
            
            {/* Main Content - Changes based on match status */}
            <div className="px-2 md:px-8">
              {renderMainContent()}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default FaceitMatchPage;
