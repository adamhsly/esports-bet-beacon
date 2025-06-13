
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Loader2, AlertTriangle, Zap, Users, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MatchVotingWidget from '@/components/MatchVotingWidget';
import { FaceitMatchHeader } from '@/components/match-details/FaceitMatchHeader';
import { FaceitPlayerRoster } from '@/components/match-details/FaceitPlayerRoster';
import { FaceitPreMatchStats } from '@/components/match-details/FaceitPreMatchStats';
import { FaceitMatchNotifications } from '@/components/match-details/FaceitMatchNotifications';
import { FaceitPlayerLineupTable } from '@/components/match-details/FaceitPlayerLineupTable';
import { fetchSupabaseFaceitMatchDetails, triggerFaceitPlayerStatsSync } from '@/lib/supabaseFaceitApi';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

const FaceitUpcomingMatchPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [isLoadingPlayerStats, setIsLoadingPlayerStats] = useState(false);
  
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
    staleTime: 30000, // 30 seconds since we're fetching from our database
    retry: 1
  });

  // Check if we have enhanced player stats and count them
  const getStatsStatus = () => {
    if (!matchDetails) return { totalPlayers: 0, enhancedPlayers: 0, hasAnyEnhanced: false };
    
    let totalPlayers = 0;
    let enhancedPlayers = 0;
    
    matchDetails.teams.forEach(team => {
      if (team.roster) {
        team.roster.forEach(player => {
          totalPlayers++;
          if (player.total_matches && player.total_matches > 0) {
            enhancedPlayers++;
          }
        });
      }
    });
    
    return {
      totalPlayers,
      enhancedPlayers,
      hasAnyEnhanced: enhancedPlayers > 0,
      allEnhanced: enhancedPlayers === totalPlayers && totalPlayers > 0
    };
  };

  const statsStatus = getStatsStatus();

  // Function to sync player stats for enhanced display
  const syncPlayerStats = async () => {
    if (!matchDetails) return;
    
    setIsLoadingPlayerStats(true);
    
    try {
      // Extract all player IDs from both teams
      const playerIds: string[] = [];
      matchDetails.teams.forEach(team => {
        if (team.roster) {
          team.roster.forEach(player => {
            if (player.player_id) {
              playerIds.push(player.player_id);
            }
          });
        }
      });

      console.log(`🔄 Syncing enhanced stats for ${playerIds.length} players...`);
      
      const success = await triggerFaceitPlayerStatsSync(playerIds);
      
      if (success) {
        toast({
          title: "Sync Started!",
          description: `Enhanced stats sync initiated for ${playerIds.length} players. Refreshing data in a few seconds...`,
        });
        
        // Refetch match details after a delay to get updated stats
        setTimeout(() => {
          refetch();
        }, 4000);
      } else {
        throw new Error('Failed to trigger player stats sync');
      }
    } catch (error) {
      console.error('❌ Error syncing player stats:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync enhanced player stats. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPlayerStats(false);
    }
  };

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
        <div className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
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
        <div className="flex-grow container mx-auto px-4 py-8">
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

  console.log('🎯 Rendering match details with stats status:', statsStatus);

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Error Alert if there were issues */}
          {error && (
            <Alert className="bg-yellow-500/10 border-yellow-500/30">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-yellow-400">
                Some data may be incomplete. Displaying available information from our database.
              </AlertDescription>
            </Alert>
          )}

          {/* Enhanced Stats Status Card */}
          {!statsStatus.allEnhanced && (
            <Card className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-orange-500/10 border-blue-500/30">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  <span>Enhanced Player Statistics</span>
                </CardTitle>
                <CardDescription>
                  {statsStatus.enhancedPlayers === 0 ? (
                    "No enhanced statistics available for players in this match"
                  ) : (
                    `Enhanced stats available for ${statsStatus.enhancedPlayers} of ${statsStatus.totalPlayers} players`
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-400">
                      Enhanced stats include win rates, K/D ratios, recent form, match history, and detailed performance metrics.
                    </p>
                    {statsStatus.enhancedPlayers > 0 && (
                      <p className="text-xs text-green-400">
                        ✓ Partial enhanced data available
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={syncPlayerStats}
                    disabled={isLoadingPlayerStats}
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    {isLoadingPlayerStats ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Sync Enhanced Stats
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success message when all players have enhanced stats */}
          {statsStatus.allEnhanced && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <TrendingUp className="h-4 w-4" />
              <AlertDescription className="text-green-400">
                ✓ Enhanced statistics available for all {statsStatus.totalPlayers} players in this match
              </AlertDescription>
            </Alert>
          )}

          {/* Match Header */}
          <FaceitMatchHeader match={matchDetails} />
          
          {/* Player Lineup Table - Enhanced with real data */}
          <FaceitPlayerLineupTable teams={matchDetails.teams} />
          
          {/* Main Content Tabs */}
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
              <FaceitMatchNotifications 
                matchId={matchDetails.id}
                teams={matchDetails.teams}
                startTime={matchDetails.startTime}
              />
              <FaceitPreMatchStats 
                teams={matchDetails.teams}
                faceitData={matchDetails.faceitData}
              />
            </TabsContent>
            
            {/* Rosters Tab */}
            <TabsContent value="rosters">
              <FaceitPlayerRoster teams={matchDetails.teams} />
            </TabsContent>
            
            {/* Pre-Match Analysis Tab */}
            <TabsContent value="stats">
              <FaceitPreMatchStats 
                teams={matchDetails.teams}
                faceitData={matchDetails.faceitData}
              />
            </TabsContent>
            
            {/* Community Voting Tab */}
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
          </Tabs>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default FaceitUpcomingMatchPage;
