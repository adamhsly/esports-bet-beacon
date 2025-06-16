
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Loader2, AlertTriangle, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import MatchVotingWidget from '@/components/MatchVotingWidget';
import { StreamViewer } from '@/components/StreamViewer';
import { FaceitMatchHeader } from '@/components/match-details/FaceitMatchHeader';
import { FaceitCompactMatchHeader } from '@/components/match-details/FaceitCompactMatchHeader';
import { FaceitPlayerRoster } from '@/components/match-details/FaceitPlayerRoster';
import { FaceitMobilePlayerLineup } from '@/components/match-details/FaceitMobilePlayerLineup';
import { FaceitPreMatchStats } from '@/components/match-details/FaceitPreMatchStats';
import { FaceitPlayerLineupTable } from '@/components/match-details/FaceitPlayerLineupTable';
import { fetchSupabaseFaceitMatchDetails } from '@/lib/supabaseFaceitApi';
import { extractFaceitStreamsFromMatch } from '@/utils/faceitStreamUtils';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useMobile } from '@/hooks/useMobile';

const FaceitUpcomingMatchPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const isMobile = useMobile();
  
  console.log('🎮 FACEIT Match Page - Match ID:', matchId);
  
  // Use React Query to fetch FACEIT match details from database
  const { data: matchDetails, isLoading, error } = useQuery({
    queryKey: ['faceit-match-details', matchId],
    queryFn: async () => {
      if (!matchId) throw new Error('No match ID provided');
      
      console.log(`🔍 Fetching FACEIT match details from database for: ${matchId}`);
      const match = await fetchSupabaseFaceitMatchDetails(matchId);
      
      if (!match) {
        throw new Error('FACEIT match not found in database');
      }
      
      // Check if match is live and redirect if so
      const isLive = match.status === 'ongoing' || match.status === 'live' || match.status === 'running';
      
      if (isLive) {
        console.log('🔴 Match is live, redirecting to live page');
        navigate(`/faceit/live/${matchId}`, { replace: true });
        return null;
      }
      
      console.log('✅ FACEIT match details retrieved from database:', match);
      return match;
    },
    enabled: !!matchId,
    staleTime: 30000,
    retry: 1
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

  // Extract streams from FACEIT match data
  const streams = extractFaceitStreamsFromMatch(matchDetails);

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />

      <div className={`flex-grow w-full`}>
        <div className={`max-w-5xl mx-auto w-full px-2 md:px-8 ${isMobile ? 'py-2' : 'py-8'}`}>
          <div className={`space-y-${isMobile ? '2' : '8'}`}>
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

            {/* Match Header - Use compact version on mobile */}
            <div className="px-2 md:px-8">
              {isMobile ? (
                <FaceitCompactMatchHeader match={matchDetails} isMobile={true} />
              ) : (
                <FaceitMatchHeader match={matchDetails} />
              )}
            </div>

            {/* Championship Stream Widget - Only show if streams are available */}
            {streams.length > 0 && (
              <div className="px-2 md:px-8">
                <Card className="bg-theme-gray-dark border-theme-gray-medium">
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Championship Stream</h3>
                    <StreamViewer streams={streams} showTabs={streams.length > 1} />
                  </div>
                </Card>
              </div>
            )}
            
            {/* Player Lineup - Use mobile-optimized component on mobile */}
            <div className="px-2 md:px-8">
              {isMobile ? (
                <FaceitMobilePlayerLineup teams={matchDetails.teams} />
              ) : (
                <FaceitPlayerLineupTable teams={matchDetails.teams} />
              )}
            </div>
            
            {/* Main Content - Simplified for mobile/desktop */}
            <div className="px-2 md:px-8">
              {isMobile ? (
                <div className="space-y-2">
                  {/* Pre-Match Stats */}
                  <FaceitPreMatchStats 
                    teams={matchDetails.teams}
                    faceitData={matchDetails.faceitData}
                  />
                  {/* Community Voting */}
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
                </div>
              ) : (
                // Desktop tabs remain the same, but inside px box
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="bg-theme-gray-dark border border-theme-gray-light w-full flex justify-start p-1 mb-6">
                    <TabsTrigger 
                      value="overview" 
                      className="data-[state=active]:bg-orange-500 data-[state=active]:text-white py-2 px-4"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger 
                      value="rosters" 
                      className="data-[state=active]:bg-orange-500 data-[state=active]:text-white py-2 px-4"
                    >
                      Team Rosters
                    </TabsTrigger>
                    <TabsTrigger 
                      value="stats" 
                      className="data-[state=active]:bg-orange-500 data-[state=active]:text-white py-2 px-4"
                    >
                      Pre-Match Analysis
                    </TabsTrigger>
                    <TabsTrigger 
                      value="voting" 
                      className="data-[state=active]:bg-orange-500 data-[state=active]:text-white py-2 px-4"
                    >
                      Community Vote
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6">
                    <div className="px-2 md:px-8">
                      <FaceitPreMatchStats 
                        teams={matchDetails.teams}
                        faceitData={matchDetails.faceitData}
                      />
                    </div>
                  </TabsContent>
                  
                  {/* Rosters Tab */}
                  <TabsContent value="rosters">
                    <div className="px-2 md:px-8">
                      <FaceitPlayerRoster teams={matchDetails.teams} />
                    </div>
                  </TabsContent>
                  
                  {/* Pre-Match Analysis Tab */}
                  <TabsContent value="stats">
                    <div className="px-2 md:px-8">
                      <FaceitPreMatchStats 
                        teams={matchDetails.teams}
                        faceitData={matchDetails.faceitData}
                      />
                    </div>
                  </TabsContent>
                  
                  {/* Community Voting Tab */}
                  <TabsContent value="voting">
                    <div className="space-y-6 px-2 md:px-8">
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
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default FaceitUpcomingMatchPage;
