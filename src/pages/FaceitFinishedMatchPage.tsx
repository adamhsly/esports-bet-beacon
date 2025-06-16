
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Loader2, AlertTriangle, CheckCircle, ExternalLink, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { FaceitFinishedMatchHeader } from '@/components/match-details/FaceitFinishedMatchHeader';
import { FaceitPlayerPerformanceTable } from '@/components/match-details/FaceitPlayerPerformanceTable';
import { FaceitPlayerRoster } from '@/components/match-details/FaceitPlayerRoster';
import { fetchSupabaseFaceitMatchDetails } from '@/lib/supabaseFaceitApi';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

const FaceitFinishedMatchPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  
  console.log('🏁 FACEIT Finished Match Page - Match ID:', matchId);
  
  // Use React Query for finished match details
  const { data: matchDetails, isLoading, error, refetch } = useQuery({
    queryKey: ['faceit-finished-match', matchId],
    queryFn: async () => {
      if (!matchId) throw new Error('No match ID provided');
      
      console.log(`🔍 Fetching finished FACEIT match details: ${matchId}`);
      const match = await fetchSupabaseFaceitMatchDetails(matchId);
      
      if (!match) {
        throw new Error('FACEIT match not found in database');
      }
      
      // Check if match is actually finished
      const isFinished = match.status === 'finished' || match.status === 'completed';
      
      if (!isFinished) {
        console.log('⚠️ Match is not finished, redirecting to appropriate page');
        // Redirect to live or upcoming page based on status
        if (match.status === 'ongoing' || match.status === 'live') {
          navigate(`/faceit/live/${matchId}`, { replace: true });
        } else {
          navigate(`/faceit/match/${matchId}`, { replace: true });
        }
        return null;
      }
      
      console.log('✅ Finished FACEIT match details retrieved:', match);
      return match;
    },
    enabled: !!matchId,
    staleTime: 300000, // 5 minutes - finished matches don't change
    retry: 2
  });

  useEffect(() => {
    if (error) {
      console.error('❌ Error loading finished FACEIT match:', error);
      toast({
        title: "Error loading finished match",
        description: "We couldn't load the finished match information.",
        variant: "destructive",
      });
    }
  }, [error]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-400 mx-auto mb-4" />
            <span className="text-lg">Loading finished match details...</span>
            <p className="text-sm text-gray-400 mt-2">Retrieving match results</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Handle redirect case (match not finished)
  if (!matchDetails) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-400 mx-auto mb-4" />
            <span className="text-lg">Redirecting...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      
      <div className="flex-grow w-full">
        <div className="max-w-5xl mx-auto w-full px-2 md:px-8 py-8">
          <div className="space-y-6">
            {/* Finished Status Banner */}
            <div className="px-2 md:px-8">
              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-400 font-semibold">
                  🏁 MATCH COMPLETED - Final results available
                </AlertDescription>
              </Alert>
            </div>

            {/* Finished Match Header */}
            <div className="px-2 md:px-8">
              <FaceitFinishedMatchHeader 
                match={{
                  ...matchDetails,
                  finishedTime: matchDetails.finished_at || matchDetails.startTime
                }} 
              />
            </div>
            
            {/* Main Content Tabs */}
            <div className="px-2 md:px-8">
              <Tabs defaultValue="results" className="w-full">
                <TabsList className="bg-theme-gray-dark border border-theme-gray-light w-full flex justify-start p-1 mb-6">
                  <TabsTrigger 
                    value="results" 
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-white py-2 px-4"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Match Results
                  </TabsTrigger>
                  <TabsTrigger 
                    value="performance" 
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-white py-2 px-4"
                  >
                    Player Performance
                  </TabsTrigger>
                  <TabsTrigger 
                    value="rosters" 
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-white py-2 px-4"
                  >
                    Team Rosters
                  </TabsTrigger>
                </TabsList>
                
                {/* Match Results Tab */}
                <TabsContent value="results" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="px-2 md:px-4">
                      <Card className="bg-theme-gray-dark border border-theme-gray-medium p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Match Summary</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Final Score:</span>
                            <span className="text-white font-semibold">
                              {matchDetails.faceitData?.results ? 
                                `${matchDetails.faceitData.results.score.faction1} - ${matchDetails.faceitData.results.score.faction2}` : 
                                'Score unavailable'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Winner:</span>
                            <span className="text-green-400 font-semibold">
                              {matchDetails.faceitData?.results ? 
                                (matchDetails.faceitData.results.winner === 'faction1' ? 
                                  matchDetails.teams[0]?.name || 'Team 1' : 
                                  matchDetails.teams[1]?.name || 'Team 2'
                                ) : 
                                'Unknown'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Competition:</span>
                            <span className="text-white">{matchDetails.faceitData?.competitionType || 'FACEIT Match'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Region:</span>
                            <span className="text-white">{matchDetails.faceitData?.region || 'EU'}</span>
                          </div>
                        </div>
                      </Card>
                    </div>
                    <div className="px-2 md:px-4">
                      <Card className="bg-theme-gray-dark border border-theme-gray-medium p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Match Actions</h3>
                        <div className="space-y-3">
                          <button
                            onClick={() => window.open(`https://faceit.com/room/${matchDetails.id.replace('faceit_', '')}`, '_blank')}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Match Room
                          </button>
                          <button
                            onClick={() => refetch()}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold"
                          >
                            Refresh Data
                          </button>
                        </div>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Player Performance Tab */}
                <TabsContent value="performance">
                  <div className="px-2 md:px-8">
                    <FaceitPlayerPerformanceTable 
                      teams={matchDetails.teams} 
                      matchResult={matchDetails.faceitData?.results}
                    />
                  </div>
                </TabsContent>
                
                {/* Rosters Tab */}
                <TabsContent value="rosters">
                  <div className="px-2 md:px-8">
                    <FaceitPlayerRoster teams={matchDetails.teams} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default FaceitFinishedMatchPage;
