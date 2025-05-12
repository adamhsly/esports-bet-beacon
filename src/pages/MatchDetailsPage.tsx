import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Trophy, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OddsTable } from '@/components/OddsTable';
import { MatchVotingWidget } from '@/components/MatchVotingWidget';
import { TeamProfile } from '@/components/TeamProfile';
import { getTeamImageUrl } from '@/utils/cacheUtils';
import DynamicMatchSEOContent from '@/components/DynamicMatchSEOContent';

interface MatchDetails {
  id: string;
  startTime: string;
  tournament: string;
  esportType: string;
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

  useEffect(() => {
    async function fetchMatchDetails() {
      setIsLoading(true);
      // Mock data for demonstration
      const mockMatchDetails: MatchDetails = {
        id: matchId || '123',
        startTime: new Date().toISOString(),
        tournament: 'The International',
        esportType: 'dota2',
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
            
            <Tabs defaultValue="odds" className="w-full">
              <TabsList className="bg-theme-gray-dark border border-theme-gray-light w-full flex justify-start p-1">
                <TabsTrigger value="odds" className="data-[state=active]:bg-theme-purple data-[state=active]:text-white py-2 px-4">
                  Betting Odds
                </TabsTrigger>
                <TabsTrigger value="team1" className="data-[state=active]:bg-theme-purple data-[state=active]:text-white py-2 px-4">
                  {matchDetails.teams && matchDetails.teams.length > 0 ? matchDetails.teams[0].name : 'Team 1'}
                </TabsTrigger>
                <TabsTrigger value="team2" className="data-[state=active]:bg-theme-purple data-[state=active]:text-white py-2 px-4">
                  {matchDetails.teams && matchDetails.teams.length > 1 ? matchDetails.teams[1].name : 'Team 2'}
                </TabsTrigger>
                <TabsTrigger value="community" className="data-[state=active]:bg-theme-purple data-[state=active]:text-white py-2 px-4">
                  Community
                </TabsTrigger>
              </TabsList>
              <TabsContent value="odds" className="mt-6">
                <OddsTable />
              </TabsContent>
              <TabsContent value="team1" className="mt-6">
                {matchDetails.teams && matchDetails.teams.length > 0 ? (
                  <TeamProfile team={matchDetails.teams[0]} />
                ) : (
                  <p>Team 1 profile will be displayed here.</p>
                )}
              </TabsContent>
              <TabsContent value="team2" className="mt-6">
                {matchDetails.teams && matchDetails.teams.length > 1 ? (
                  <TeamProfile team={matchDetails.teams[1]} />
                ) : (
                  <p>Team 2 profile will be displayed here.</p>
                )}
              </TabsContent>
              <TabsContent value="community" className="mt-6">
                <MatchVotingWidget />
              </TabsContent>
            </Tabs>
            
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
