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
import { EnhancedTeamComparison } from '@/components/EnhancedTeamComparison';
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
      
      // Time-based live status determination
      const now = new Date();
      const matchStart = new Date(match.start_time);
      const hasStarted = now >= matchStart;
      const isFinished = ['finished', 'completed', 'cancelled'].includes(match.status?.toLowerCase() || '');
      
      const isLive = hasStarted && !isFinished;
      
      if (!isLive) {
        console.log('⚠️ Match is not live (time-based check), redirecting to upcoming page');
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
      
      <div className="flex-grow max-w-5xl mx-auto w-full px-2 md:px-8 py-2 md:py-8">
        <div className="space-y-4 md:space-y-8">
          <Alert className="bg-red-500/10 border-red-500/30">
            <Radio className="h-4 w-4 text-red-400 animate-pulse" />
            <AlertDescription className="text-red-400 font-semibold">
              🔴 LIVE MATCH - Real-time updates every 30 seconds
            </AlertDescription>
          </Alert>

          <PandaScoreLiveMatchHeader match={matchDetails} />
          
          <PandaScoreLiveScorecard match={matchDetails} />
          
          {/* Match Information Card */}
          <Card className="bg-theme-gray-dark border border-theme-gray-medium">
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-4">Match Information</h3>
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
            </div>
          </Card>

          {/* Quick Actions Card */}
          <Card className="bg-theme-gray-dark border border-theme-gray-medium">
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <button
                onClick={() => refetch()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
              >
                Refresh Live Data
              </button>
            </div>
          </Card>

          {/* Team Rosters Card */}
          <Card className="bg-theme-gray-dark border border-theme-gray-medium">
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-4">Team Rosters</h3>
              <PandaScorePlayerRoster teams={matchDetails.teams} />
            </div>
          </Card>

          {/* Team Analysis Card */}
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

          {/* Official Streams Card */}
          <Card className="bg-theme-gray-dark border border-theme-gray-medium">
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-4">Official Streams</h3>
              <StreamViewer streams={extractStreamsFromRawData(matchDetails.rawData)} />
            </div>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PandaScoreLiveMatchPage;
