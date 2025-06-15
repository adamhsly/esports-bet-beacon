import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Loader2, AlertTriangle, Radio, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PandaScoreLiveMatchHeader } from '@/components/match-details/PandaScoreLiveMatchHeader';
import { PandaScoreLiveScorecard } from '@/components/match-details/PandaScoreLiveScorecard';
import { PandaScorePlayerRoster } from '@/components/match-details/PandaScorePlayerRoster';
import { fetchSupabasePandaScoreMatchDetails } from '@/lib/supabasePandaScoreApi';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { StreamViewer, extractStreamsFromRawData } from "@/components/StreamViewer";

const PandaScoreLiveMatchPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  
  console.log('🔴 PandaScore Live Match Page - Match ID:', matchId);
  
  const { data: matchDetails, isLoading, error, refetch } = useQuery({
    queryKey: ['pandascore-live-match', matchId],
    queryFn: async () => {
      if (!matchId) throw new Error('No match ID provided');
      
      console.log(`🔍 Fetching live PandaScore match details: ${matchId}`);
      const match = await fetchSupabasePandaScoreMatchDetails(matchId);
      
      if (!match) {
        throw new Error('PandaScore match not found in database');
      }
      
      const isLive = match.status === 'running' || match.status === 'live';
      
      if (!isLive) {
        console.log('⚠️ Match is not live, redirecting to upcoming page');
        navigate(`/pandascore/match/${matchId}`, { replace: true });
        return null;
      }
      
      console.log('✅ Live PandaScore match details retrieved:', match);
      return match;
    },
    enabled: !!matchId,
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 2
  });

  useEffect(() => {
    if (error) {
      console.error('❌ Error loading live PandaScore match:', error);
      toast({
        title: "Error loading live match",
        description: "We couldn't load the live match information.",
        variant: "destructive",
      });
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
            <span className="text-lg">Loading live match details...</span>
            <p className="text-sm text-gray-400 mt-2">Fetching real-time pro match data</p>
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
        <div className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
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
      
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Alert className="bg-red-500/10 border-red-500/30">
            <Radio className="h-4 w-4 text-red-400 animate-pulse" />
            <AlertDescription className="text-red-400 font-semibold">
              🔴 LIVE MATCH - Real-time updates every 30 seconds
            </AlertDescription>
          </Alert>

          <PandaScoreLiveMatchHeader match={matchDetails} />
          
          <PandaScoreLiveScorecard match={matchDetails} />
          
          <Tabs defaultValue="live" className="w-full">
            <TabsList className="bg-theme-gray-dark border border-theme-gray-light w-full flex justify-start p-1 mb-6">
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
                value="stream"
                className="data-[state=active]:bg-red-500 data-[state=active]:text-white py-2 px-4"
              >
                🎥 Live Stream
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="live" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-theme-gray-dark border border-theme-gray-medium p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Match Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tournament:</span>
                      <span className="text-white">{matchDetails.tournament || 'Pro Match'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Format:</span>
                      <span className="text-white">Best of {matchDetails.bestOf || 3}</span>
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

                <Card className="bg-theme-gray-dark border border-theme-gray-medium p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => refetch()}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold"
                    >
                      Refresh Live Data
                    </button>
                  </div>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="rosters">
              <PandaScorePlayerRoster teams={matchDetails.teams} />
            </TabsContent>

            <TabsContent value="stream">
              <Card className="bg-theme-gray-dark border border-theme-gray-medium p-6">
                <h3 className="text-xl font-bold text-white mb-4">Official Streams</h3>
                <StreamViewer streams={extractStreamsFromRawData(matchDetails.rawData)} />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PandaScoreLiveMatchPage;
