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
import { PandaScoreCompactMatchHeader } from '@/components/match-details/PandaScoreCompactMatchHeader';
import { PandaScorePlayerRoster } from '@/components/match-details/PandaScorePlayerRoster';
import { PandaScoreMobilePlayerLineup } from '@/components/match-details/PandaScoreMobilePlayerLineup';
import { PandaScorePreMatchStats } from '@/components/match-details/PandaScorePreMatchStats';
import { PandaScorePlayerLineupTable } from '@/components/match-details/PandaScorePlayerLineupTable';
import { fetchSupabasePandaScoreMatchDetails } from '@/lib/supabasePandaScoreApi';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useMobile } from '@/hooks/useMobile';
import { StreamViewer, extractStreamsFromRawData } from "@/components/StreamViewer";

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
      
      // Check if match is live and redirect if so
      const isLive = match.status === 'running' || match.status === 'live';
      
      if (isLive) {
        console.log('🔴 Match is live, redirecting to live page');
        navigate(`/pandascore/live/${matchId}`, { replace: true });
        return null;
      }
      
      console.log('✅ PandaScore match details retrieved from database:', match);
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

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      
      <div className={`flex-grow container mx-auto ${isMobile ? 'px-1 py-2' : 'px-4 py-8'}`}>
        <div className={`space-y-${isMobile ? '2' : '8'}`}>
          {error && (
            <Alert className="bg-yellow-500/10 border-yellow-500/30">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-yellow-400">
                Some data may be incomplete. Displaying available information from our database.
              </AlertDescription>
            </Alert>
          )}

          {isMobile ? (
            <PandaScoreCompactMatchHeader match={matchDetails} isMobile={true} />
          ) : (
            <PandaScoreMatchHeader match={matchDetails} />
          )}
          
          {isMobile ? (
            <PandaScoreMobilePlayerLineup teams={matchDetails.teams} />
          ) : (
            <PandaScorePlayerLineupTable teams={matchDetails.teams} />
          )}
          
          {isMobile ? (
            <div className="space-y-2">
              <PandaScorePreMatchStats 
                teams={matchDetails.teams}
                tournament={matchDetails.tournament}
              />
              
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
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-theme-gray-dark border border-theme-gray-light w-full flex justify-start p-1 mb-6">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-blue-500 data-[state=active]:text-white py-2 px-4"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="rosters" 
                  className="data-[state=active]:bg-blue-500 data-[state=active]:text-white py-2 px-4"
                >
                  Team Rosters
                </TabsTrigger>
                <TabsTrigger 
                  value="stats" 
                  className="data-[state=active]:bg-blue-500 data-[state=active]:text-white py-2 px-4"
                >
                  Pre-Match Analysis
                </TabsTrigger>
                <TabsTrigger 
                  value="voting" 
                  className="data-[state=active]:bg-blue-500 data-[state=active]:text-white py-2 px-4"
                >
                  Community Vote
                </TabsTrigger>
                <TabsTrigger
                  value="stream"
                  className="data-[state=active]:bg-blue-500 data-[state=active]:text-white py-2 px-4"
                >
                  🎥 Stream Info
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <PandaScorePreMatchStats 
                  teams={matchDetails.teams}
                  tournament={matchDetails.tournament}
                />
              </TabsContent>
              
              <TabsContent value="rosters">
                <PandaScorePlayerRoster teams={matchDetails.teams} />
              </TabsContent>
              
              <TabsContent value="stats">
                <PandaScorePreMatchStats 
                  teams={matchDetails.teams}
                  tournament={matchDetails.tournament}
                />
              </TabsContent>
              
              <TabsContent value="voting">
                <div className="space-y-6">
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
              
              <TabsContent value="stream">
                <Card className="bg-theme-gray-dark border border-theme-gray-medium p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Streams</h3>
                  <StreamViewer streams={extractStreamsFromRawData(matchDetails.rawData)} />
                  <p className="text-xs text-gray-400 mt-2">
                    Streams will be available closer to match time. Check back before the match starts!
                  </p>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PandaScoreUpcomingMatchPage;
