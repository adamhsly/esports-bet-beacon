import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Trophy, Users, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OddsTable } from '@/components/OddsTable';
import MatchVotingWidget from '@/components/MatchVotingWidget';
import { TeamProfile } from '@/components/TeamProfile';
import { getTeamImageUrl } from '@/utils/cacheUtils';
import DynamicMatchSEOContent from '@/components/DynamicMatchSEOContent';
import { useIsMobile } from '@/hooks/use-mobile';
import { fetchMatchById } from '@/lib/sportDevsApi';
import { fetchFaceitMatchDetails } from '@/lib/faceitApi';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { getEnhancedTeamLogoUrl } from '@/utils/teamLogoUtils';
import TeamPlayerStatsVisualizer from '@/components/TeamPlayerStatsVisualizer';
import MatchLineupTable from '@/components/MatchLineupTable';
import { Player } from '@/components/MatchCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface MatchDetails {
  id: string;
  startTime: string;
  tournament: string;
  esportType: string;
  twitchChannel?: string;
  teams: {
    id?: string;
    name: string;
    logo: string;
    hash_image?: string | null;
  }[];
  bestOf?: number;
  homeTeamPlayers?: Player[];
  awayTeamPlayers?: Player[];
  source?: 'professional' | 'amateur';
  faceitData?: {
    region?: string;
    competitionType?: string;
    organizedBy?: string;
    calculateElo?: boolean;
  };
  faceitMatchDetails?: {
    version?: number;
    configuredAt?: string;
    finishedAt?: string;
    voting?: any;
  };
}

const MatchDetailsPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Check if this is a FACEIT match and redirect if needed
  const isFaceitMatch = matchId?.startsWith('faceit_') || false;
  
  useEffect(() => {
    if (isFaceitMatch && matchId) {
      console.log('🔄 Redirecting FACEIT match to specialized page:', matchId);
      navigate(`/faceit/match/${matchId}`, { replace: true });
      return;
    }
  }, [matchId, isFaceitMatch, navigate]);
  
  // Use React Query to fetch match details - but skip for FACEIT matches since we're redirecting
  const { data: matchDetails, isLoading, error } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      console.log(`=== MATCH DETAILS PAGE DEBUG ===`);
      console.log(`Fetching match details for ID: ${matchId}`);
      console.log(`Is FACEIT match: ${isFaceitMatch}`);
      
      try {
        if (matchId && !isFaceitMatch) {
          // Only fetch from SportDevs API for non-FACEIT matches
          const match = await fetchMatchById(matchId);
          if (match) {
            console.log("=== SportDevs match data successfully retrieved ===");
            console.log("Match teams:", match.teams);
            console.log("Home team players:", match.homeTeamPlayers?.length || 0);
            console.log("Away team players:", match.awayTeamPlayers?.length || 0);
            console.log("Full match data:", match);
            
            return {
              ...match,
              source: 'professional' as const,
              twitchChannel: match.tournament?.toLowerCase().includes('esl') ? 'esl_dota2' : 
                            match.esportType === 'lol' ? 'lck' : 
                            match.esportType === 'csgo' ? 'esl_csgo' : 'dota2ti'
            };
          }
        }
        throw new Error("Match not found");
      } catch (err) {
        console.error("Error fetching match:", err);
        
        // Create fallback data based on the match ID from params
        const currentMatchId = matchId || 'unknown';
        const teamNames = currentMatchId.includes('team') ? 
          ['Team Liquid', 'Team Secret'] : 
          (parseInt(currentMatchId) % 2 === 0 ? 
           ['Evil Geniuses', 'Nigma Galaxy'] : 
           ['OG', 'Cloud9']);
          
        const mockMatchDetails: MatchDetails = {
          id: currentMatchId,
          startTime: new Date().toISOString(),
          tournament: 'The International',
          esportType: 'csgo',
          twitchChannel: 'esl_csgo',
          bestOf: 3,
          source: 'professional',
          teams: [
            { name: teamNames[0], logo: '/placeholder.svg', id: `team${currentMatchId}-1` },
            { name: teamNames[1], logo: '/placeholder.svg', id: `team${currentMatchId}-2` },
          ],
        };
        
        console.log("Using mock data as fallback for match ID:", currentMatchId);
        return mockMatchDetails;
      }
    },
    enabled: !!matchId && !isFaceitMatch, // Only enable query for non-FACEIT matches
    staleTime: 60000,
    retryOnMount: true,
    retry: 1
  });

  // Show loading state during FACEIT redirect
  if (isFaceitMatch) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-400 mx-auto mb-4" />
            <span className="text-lg">Redirecting to FACEIT match page...</span>
            <p className="text-sm text-gray-400 mt-2">Loading specialized FACEIT interface</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  useEffect(() => {
    if (error) {
      console.error("Error loading match details:", error);
      toast({
        title: "Error loading match details",
        description: "We couldn't load the match information. Please try again later.",
        variant: "destructive",
      });
    }
  }, [error]);

  // Create mock data for OddsTable component
  const mockBookmakerOdds = matchDetails ? [
    {
      bookmaker: "BetZone",
      logo: "/placeholder.svg",
      odds: {
        [matchDetails.teams[0]?.name || "Team 1"]: "1.85",
        [matchDetails.teams[1]?.name || "Team 2"]: "1.95"
      },
      link: "#"
    },
    {
      bookmaker: "GG.bet",
      logo: "/placeholder.svg",
      odds: {
        [matchDetails.teams[0]?.name || "Team 1"]: "1.90",
        [matchDetails.teams[1]?.name || "Team 2"]: "1.92"
      },
      link: "#"
    },
    {
      bookmaker: "Betway",
      logo: "/placeholder.svg",
      odds: {
        [matchDetails.teams[0]?.name || "Team 1"]: "1.87",
        [matchDetails.teams[1]?.name || "Team 2"]: "1.93"
      },
      link: "#"
    }
  ] : [];

  const mockMarkets = matchDetails ? [
    {
      name: "Match Winner",
      options: [matchDetails.teams[0]?.name || "Team 1", matchDetails.teams[1]?.name || "Team 2"]
    },
    {
      name: "Map 1 Winner",
      options: [matchDetails.teams[0]?.name || "Team 1", matchDetails.teams[1]?.name || "Team 2"]
    }
  ] : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-theme-purple mr-2" />
          <span>Loading match details...</span>
        </div>
        <Footer />
      </div>
    );
  }

  // Remove the amateur/FACEIT specific logic since those matches are now redirected
  return (
    <div className="min-h-screen flex flex-col bg-theme-gray-dark theme-alt-card">
      <SearchableNavbar />
      
      {/* Main content area with responsive padding */}
      <div className="flex-grow w-full">
        <div className="max-w-5xl mx-auto w-full px-2 md:px-8 py-8">
          <div className="space-y-8">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-theme-purple" />
              </div>
            ) : matchDetails ? (
              <>
                <div className="px-2 md:px-8">
                  <div className="flex items-center gap-3 mb-4">
                    <h1 className="text-3xl font-bold font-gaming">
                      {matchDetails.teams && matchDetails.teams.length > 0
                        ? `${matchDetails.teams[0].name} vs ${matchDetails.teams[1].name}`
                        : 'Match Details'}
                    </h1>
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-400/30">
                      <Trophy size={16} className="mr-1" />
                      Professional
                    </Badge>
                  </div>
                  <div className="flex items-center text-gray-400 flex-wrap gap-4">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{new Date(matchDetails.startTime).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      <Trophy className="h-4 w-4 mr-2" />
                      <span>{matchDetails.tournament}</span>
                    </div>
                  </div>
                </div>
              
              {/* Scoreboard Section */}
              <div className="px-2 md:px-8">
                <Card className="bg-card border border-border overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center justify-between">
                    {/* Team 1 */}
                    <div className="flex-1 p-4 text-center">
                      <img 
                        src={getEnhancedTeamLogoUrl(matchDetails.teams[0])} 
                        alt={matchDetails.teams[0]?.name || "Team 1"} 
                        className="w-20 h-20 object-contain mx-auto mb-2"
                        onError={(e) => {
                          console.log(`Match Page - Image load error for team ${matchDetails.teams[0]?.name}`);
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                      <h3 className="text-lg font-bold">{matchDetails.teams[0]?.name || "Team 1"}</h3>
                    </div>
                    
                    {/* Score */}
                    <div className="flex flex-col items-center justify-center p-4">
                      <div className="flex items-center space-x-4">
                        <span className="text-3xl font-bold">0</span>
                        <span className="text-xl font-bold text-gray-400">vs</span>
                        <span className="text-3xl font-bold">0</span>
                      </div>
                      <div className="flex items-center mt-2 text-sm text-gray-400">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{new Date(matchDetails.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <Badge className="mt-2 bg-theme-purple">
                        {new Date(matchDetails.startTime) > new Date() ? 'UPCOMING' : 'LIVE'}
                      </Badge>
                    </div>
                    
                    {/* Team 2 */}
                    <div className="flex-1 p-4 text-center">
                      <img 
                        src={getEnhancedTeamLogoUrl(matchDetails.teams[1])} 
                        alt={matchDetails.teams[1]?.name || "Team 2"} 
                        className="w-20 h-20 object-contain mx-auto mb-2"
                        onError={(e) => {
                          console.log(`Match Page - Image load error for team ${matchDetails.teams[1]?.name}`);
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                      <h3 className="text-lg font-bold">{matchDetails.teams[1]?.name || "Team 2"}</h3>
                    </div>
                  </div>
                </Card>
              </div>
              
              {/* Twitch Stream Embed - Only for professional matches */}
              {matchDetails.twitchChannel && (
                <div className="bg-theme-gray-dark border border-theme-gray-medium rounded-lg overflow-hidden px-2 md:px-8">
                  <div className="p-4 border-b border-theme-gray-medium">
                    <h2 className="text-lg font-bold text-white flex items-center">
                      <span className="h-2 w-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                      Live Stream
                    </h2>
                  </div>
                  <div className="relative w-full" style={{ paddingTop: isMobile ? '56.25%' : '40%' }}>
                    <iframe
                      src={`https://player.twitch.tv/?channel=${matchDetails.twitchChannel}&parent=esports-bet-beacon.lovable.app&muted=true`}
                      frameBorder="0"
                      allowFullScreen={true}
                      scrolling="no"
                      className="absolute top-0 left-0 w-full h-full"
                      title={`${matchDetails.teams?.[0]?.name || 'Team 1'} vs ${matchDetails.teams?.[1]?.name || 'Team 2'} Live Stream`}
                    ></iframe>
                  </div>
                </div>
              )}
              
              {/* Match Information Tabs */}
              <div className="px-2 md:px-8">
                <Tabs defaultValue="vote">
                  <TabsList className="bg-theme-gray-dark border border-theme-gray-light w-full flex justify-start p-1 mb-8">
                    <TabsTrigger value="vote" className="data-[state=active]:bg-theme-purple data-[state=active]:text-white py-2 px-4">
                      Community Vote
                    </TabsTrigger>
                    <TabsTrigger value="teams" className="data-[state=active]:bg-theme-purple data-[state=active]:text-white py-2 px-4">
                      Team Stats
                    </TabsTrigger>
                    <TabsTrigger value="odds" className="data-[state=active]:bg-theme-purple data-[state=active]:text-white py-2 px-4">
                      Betting Odds
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Voting Widget */}
                  <TabsContent value="vote" className="mt-2">
                    <div className="px-2 md:px-8">
                      <h3 className="text-lg font-bold mb-4">Community Vote</h3>
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
                  
                  {/* Team Stats */}
                  <TabsContent value="teams" className="mt-2">
                    <div className="px-2 md:px-8">
                      <h3 className="text-lg font-bold mb-4">Team Stats</h3>
                      <Tabs defaultValue="team1" className="w-full">
                        <TabsList className="bg-theme-gray-dark border border-theme-gray-light w-full flex justify-start p-1">
                          <TabsTrigger value="team1" className="data-[state=active]:bg-theme-purple data-[state=active]:text-white py-2 px-4">
                            {matchDetails.teams && matchDetails.teams.length > 0 ? matchDetails.teams[0].name : 'Team 1'}
                          </TabsTrigger>
                          <TabsTrigger value="team2" className="data-[state=active]:bg-theme-purple data-[state=active]:text-white py-2 px-4">
                            {matchDetails.teams && matchDetails.teams.length > 1 ? matchDetails.teams[1].name : 'Team 2'}
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="team1" className="mt-2">
                          <div className="space-y-6">
                            <TeamProfile 
                              team={{
                                id: matchDetails.teams[0]?.id || 'team1',
                                name: matchDetails.teams[0]?.name || 'Team 1',
                                image_url: matchDetails.teams[0]?.logo || '/placeholder.svg',
                                hash_image: matchDetails.teams[0]?.hash_image || null
                              }} 
                            />
                            <TeamPlayerStatsVisualizer
                              teamId={matchDetails.teams[0]?.id || 'team1'}
                              teamName={matchDetails.teams[0]?.name || 'Team 1'}
                              esportType={matchDetails.esportType}
                              opponentTeamId={matchDetails.teams[1]?.id}
                              opponentTeamName={matchDetails.teams[1]?.name}
                            />
                          </div>
                        </TabsContent>
                        <TabsContent value="team2" className="mt-2">
                          <div className="space-y-6">
                            <TeamProfile 
                              team={{
                                id: matchDetails.teams[1]?.id || 'team2',
                                name: matchDetails.teams[1]?.name || 'Team 2',
                                image_url: matchDetails.teams[1]?.logo || '/placeholder.svg',
                                hash_image: matchDetails.teams[1]?.hash_image || null
                              }}
                            />
                            <TeamPlayerStatsVisualizer
                              teamId={matchDetails.teams[1]?.id || 'team2'}
                              teamName={matchDetails.teams[1]?.name || 'Team 2'}
                              esportType={matchDetails.esportType}
                              opponentTeamId={matchDetails.teams[0]?.id}
                              opponentTeamName={matchDetails.teams[0]?.name}
                            />
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </TabsContent>
                  
                  {/* Odds Widget */}
                  <TabsContent value="odds" className="mt-2">
                    <div className="px-2 md:px-8">
                      <h3 className="text-lg font-bold mb-4">Betting Odds</h3>
                      <OddsTable 
                        bookmakerOdds={mockBookmakerOdds}
                        markets={mockMarkets}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Lineup Section - Only for professional matches with player data */}
              {matchDetails.teams && matchDetails.teams.length >= 2 && (
                <>
                  <div className="px-2 md:px-8" style={{ padding: '10px', background: '#333', margin: '10px 0', borderRadius: '5px' }}>
                    <strong>DEBUG - Match Lineup Data:</strong><br/>
                    Home Team: {matchDetails.teams[0]?.name} (ID: {matchDetails.teams[0]?.id})<br/>
                    Away Team: {matchDetails.teams[1]?.name} (ID: {matchDetails.teams[1]?.id})<br/>
                    Home Players: {matchDetails.homeTeamPlayers?.length || 0}<br/>
                    Away Players: {matchDetails.awayTeamPlayers?.length || 0}<br/>
                    {matchDetails.homeTeamPlayers?.length > 0 && (
                      <div>Sample Home Player: {JSON.stringify(matchDetails.homeTeamPlayers[0], null, 2)}</div>
                    )}
                  </div>
                  
                  <div className="px-2 md:px-8">
                    <MatchLineupTable 
                      homeTeamPlayers={matchDetails.homeTeamPlayers || []}
                      awayTeamPlayers={matchDetails.awayTeamPlayers || []}
                      homeTeamName={matchDetails.teams[0].name}
                      awayTeamName={matchDetails.teams[1].name}
                    />
                  </div>
                </>
              )}
              
              {matchDetails.teams && matchDetails.teams.length >= 2 && (
                <div className="px-2 md:px-8">
                  <DynamicMatchSEOContent
                    teamOneName={matchDetails.teams[0]?.name || 'Team One'}
                    teamTwoName={matchDetails.teams[1]?.name || 'Team Two'}
                    tournament={matchDetails.tournament || 'Professional Tournament'}
                    matchDate={matchDetails.startTime || new Date()}
                    esportType={matchDetails.esportType || 'esport'}
                  />
                </div>
              )}
            </>
            ) : (
              <div className="text-center py-20">
                <p className="text-xl text-gray-400">Match details not found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default MatchDetailsPage;
