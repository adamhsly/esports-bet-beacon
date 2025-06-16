
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Loader2, AlertTriangle, Radio, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FaceitLiveMatchHeader } from '@/components/match-details/FaceitLiveMatchHeader';
import { FaceitLiveScorecard } from '@/components/match-details/FaceitLiveScorecard';
import { FaceitPlayerRoster } from '@/components/match-details/FaceitPlayerRoster';
import { FaceitLiveRoomAccess } from '@/components/match-details/FaceitLiveRoomAccess';
import { fetchSupabaseFaceitMatchDetails } from '@/lib/supabaseFaceitApi';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

const FaceitLiveMatchPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  
  console.log('🔴 FACEIT Live Match Page - Match ID:', matchId);
  
  // Use React Query with more frequent polling for live matches
  const { data: matchDetails, isLoading, error, refetch } = useQuery({
    queryKey: ['faceit-live-match', matchId],
    queryFn: async () => {
      if (!matchId) throw new Error('No match ID provided');
      
      console.log(`🔍 Fetching live FACEIT match details: ${matchId}`);
      const match = await fetchSupabaseFaceitMatchDetails(matchId);
      
      if (!match) {
        throw new Error('FACEIT match not found in database');
      }
      
      // Check if match is actually live/ongoing
      const isLive = match.status === 'ongoing' || match.status === 'live' || match.status === 'running';
      
      if (!isLive) {
        console.log('⚠️ Match is not live, redirecting to upcoming page');
        // Redirect to upcoming match page if not live
        navigate(`/faceit/match/${matchId}`, { replace: true });
        return null;
      }
      
      console.log('✅ Live FACEIT match details retrieved:', match);
      return match;
    },
    enabled: !!matchId,
    staleTime: 15000, // 15 seconds - more frequent for live matches
    refetchInterval: 30000, // Poll every 30 seconds for live updates
    retry: 2
  });

  useEffect(() => {
    if (error) {
      console.error('❌ Error loading live FACEIT match:', error);
      toast({
        title: "Error loading live match",
        description: "We couldn't load the live match information.",
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
            <span className="text-lg">Loading live match details...</span>
            <p className="text-sm text-gray-400 mt-2">Fetching real-time data</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Handle redirect case (match not live)
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
      
      {/* Add responsive px to main page content */}
      <div className="flex-grow w-full">
        <div className="max-w-5xl mx-auto w-full px-2 md:px-8 py-8">
          <div className="space-y-6">
            {/* Live Status Banner */}
            <div className="px-2 md:px-8">
              <Alert className="bg-red-500/10 border-red-500/30">
                <Radio className="h-4 w-4 text-red-400 animate-pulse" />
                <AlertDescription className="text-red-400 font-semibold">
                  🔴 LIVE MATCH - Real-time updates every 30 seconds
                </AlertDescription>
              </Alert>
            </div>

            {/* Live Match Header */}
            <div className="px-2 md:px-8">
              <FaceitLiveMatchHeader match={matchDetails} />
            </div>
            
            {/* Live Scorecard */}
            <div className="px-2 md:px-8">
              <FaceitLiveScorecard match={matchDetails} />
            </div>
            
            {/* Main Content Tabs */}
            <div className="px-2 md:px-8">
              <Tabs defaultValue="live" className="w-full">
                <TabsList className="bg-theme-gray-dark border border-theme-gray-light w-full flex justify-start p-1 mb-6" >
                  <TabsTrigger 
                    value="live" 
                    className="data-[state=active]:bg-red-500 data-[state=active]:text-white py-2 px-4"
                  >
                    <Radio className="h-4 w-4 mr-2" />
                    Live Match
                  </TabsTrigger>
                  <TabsTrigger 
                    value="rosters" 
                    className="data-[state=active]:bg-red-500 data-[state=active]:text-white py-2 px-4"
                  >
                    Team Rosters
                  </TabsTrigger>
                  <TabsTrigger 
                    value="room" 
                    className="data-[state=active]:bg-red-500 data-[state=active]:text-white py-2 px-4"
                  >
                    Match Room
                  </TabsTrigger>
                </TabsList>
                
                {/* Live Match Tab */}
                <TabsContent value="live" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="px-2 md:px-4">
                      <Card className="bg-theme-gray-dark border border-theme-gray-medium p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Match Information</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Competition:</span>
                            <span className="text-white">{matchDetails.faceitData?.competitionType || 'FACEIT Match'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Region:</span>
                            <span className="text-white">{matchDetails.faceitData?.region || 'EU'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <Badge className="bg-red-500 text-white">
                              <Radio className="h-3 w-3 mr-1 animate-pulse" />
                              LIVE
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    </div>
                    <div className="px-2 md:px-4">
                      <Card className="bg-theme-gray-dark border border-theme-gray-medium p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                          <button
                            onClick={() => window.open(`https://faceit.com/room/${matchDetails.id.replace('faceit_', '')}`, '_blank')}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Live Room
                          </button>
                          <button
                            onClick={() => refetch()}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold"
                          >
                            Refresh Live Data
                          </button>
                        </div>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Rosters Tab */}
                <TabsContent value="rosters">
                  <div className="px-2 md:px-8">
                    <FaceitPlayerRoster teams={matchDetails.teams} />
                  </div>
                </TabsContent>
                
                {/* Match Room Tab */}
                <TabsContent value="room">
                  <div className="px-2 md:px-8">
                    <FaceitLiveRoomAccess 
                      matchId={matchDetails.id}
                      teams={matchDetails.teams}
                      status="live"
                    />
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

export default FaceitLiveMatchPage;
