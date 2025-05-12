
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
  // Add other match detail properties as needed
}

const MatchDetailsPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    async function fetchMatchDetails() {
      setIsLoading(true);
      // Mock data for demonstration
      const mockMatchDetails: MatchDetails = {
        id: matchId || '123',
        startTime: new Date().toISOString(),
        tournament: 'The International',
        esportType: 'dota2',
        // Mock Twitch channel for demonstration
        twitchChannel: 'esl_dota2',
        teams: [
          { name: 'Team Secret', logo: '/placeholder.svg' },
          { name: 'Nigma Galaxy', logo: '/placeholder.svg' },
        ],
      };

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setMatchDetails(mockMatchDetails);
      setIsLoading(false);
    }

    fetchMatchDetails();
  }, [matchId]);

  // Create mock data for OddsTable component
  const mockBookmakerOdds = [
    {
      bookmaker: "BetZone",
      logo: "/placeholder.svg",
      odds: {
        "Team Secret": "1.85",
        "Nigma Galaxy": "1.95"
      },
      link: "#"
    },
    {
      bookmaker: "GG.bet",
      logo: "/placeholder.svg",
      odds: {
        "Team Secret": "1.90",
        "Nigma Galaxy": "1.92"
      },
      link: "#"
    },
    {
      bookmaker: "Betway",
      logo: "/placeholder.svg",
      odds: {
        "Team Secret": "1.87",
        "Nigma Galaxy": "1.93"
      },
      link: "#"
    }
  ];

  const mockMarkets = [
    {
      name: "Match Winner",
      options: ["Team Secret", "Nigma Galaxy"]
    },
    {
      name: "Map 1 Winner",
      options: ["Team Secret", "Nigma Galaxy"]
    }
  ];

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

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      
      <div className="flex-grow container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-theme-purple" />
          </div>
        ) : matchDetails ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold font-gaming mb-4">
                {matchDetails.teams && matchDetails.teams.length > 0
                  ? `${matchDetails.teams[0].name} vs ${matchDetails.teams[1].name}`
                  : 'Match Details'}
              </h1>
              <div className="flex items-center text-gray-400">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{new Date(matchDetails.startTime).toLocaleDateString()}</span>
                <Trophy className="h-4 w-4 mx-2" />
                <span>{matchDetails.tournament}</span>
              </div>
            </div>
            
            {/* Scoreboard Section */}
            <div className="mb-8">
              <Card className="bg-theme-gray-dark border border-theme-gray-medium overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between">
                  {/* Team 1 */}
                  <div className="flex-1 p-4 text-center">
                    <img 
                      src={matchDetails.teams[0]?.logo || "/placeholder.svg"} 
                      alt={matchDetails.teams[0]?.name || "Team 1"} 
                      className="w-20 h-20 object-contain mx-auto mb-2"
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
                      src={matchDetails.teams[1]?.logo || "/placeholder.svg"} 
                      alt={matchDetails.teams[1]?.name || "Team 2"} 
                      className="w-20 h-20 object-contain mx-auto mb-2"
                    />
                    <h3 className="text-lg font-bold">{matchDetails.teams[1]?.name || "Team 2"}</h3>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Twitch Stream Embed */}
            {matchDetails.twitchChannel && (
              <div className="mb-8 bg-theme-gray-dark border border-theme-gray-medium rounded-lg overflow-hidden">
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
            
            {/* Voting Widget */}
            <div className="mb-8">
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
            
            {/* Team Stats Tabs */}
            <div className="mb-8">
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
                  {matchDetails.teams && matchDetails.teams.length > 0 ? (
                    <TeamProfile 
                      team={{
                        id: matchDetails.teams[0].id || 'team1',
                        name: matchDetails.teams[0].name,
                        image_url: matchDetails.teams[0].logo,
                        hash_image: matchDetails.teams[0].hash_image
                      }} 
                    />
                  ) : (
                    <p>Team 1 profile will be displayed here.</p>
                  )}
                </TabsContent>
                <TabsContent value="team2" className="mt-2">
                  {matchDetails.teams && matchDetails.teams.length > 1 ? (
                    <TeamProfile 
                      team={{
                        id: matchDetails.teams[1].id || 'team2',
                        name: matchDetails.teams[1].name,
                        image_url: matchDetails.teams[1].logo,
                        hash_image: matchDetails.teams[1].hash_image
                      }}
                    />
                  ) : (
                    <p>Team 2 profile will be displayed here.</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Odds Widget */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4">Betting Odds</h3>
              <OddsTable 
                bookmakerOdds={mockBookmakerOdds}
                markets={mockMarkets}
              />
            </div>
            
            {matchDetails.teams && matchDetails.teams.length >= 2 && (
              <DynamicMatchSEOContent
                teamOneName={matchDetails.teams[0]?.name || 'Team One'}
                teamTwoName={matchDetails.teams[1]?.name || 'Team Two'}
                tournament={matchDetails.tournament || 'Professional Tournament'}
                matchDate={matchDetails.startTime || new Date()}
                esportType={matchDetails.esportType || 'esport'}
              />
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-gray-400">Match details not found.</p>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default MatchDetailsPage;
