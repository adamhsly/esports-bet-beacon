
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MatchVotingWidget from '@/components/MatchVotingWidget';
import { FaceitMatchHeader } from '@/components/match-details/FaceitMatchHeader';
import { FaceitPlayerRoster } from '@/components/match-details/FaceitPlayerRoster';
import { FaceitPreMatchStats } from '@/components/match-details/FaceitPreMatchStats';
import { FaceitMatchNotifications } from '@/components/match-details/FaceitMatchNotifications';
import { fetchFaceitMatchDetails } from '@/lib/faceitApi';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

const FaceitUpcomingMatchPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  
  // Use React Query to fetch FACEIT match details
  const { data: matchDetails, isLoading, error } = useQuery({
    queryKey: ['faceit-match', matchId],
    queryFn: async () => {
      if (!matchId) throw new Error('No match ID provided');
      
      console.log(`Fetching FACEIT upcoming match details for: ${matchId}`);
      const match = await fetchFaceitMatchDetails(matchId);
      
      if (!match) {
        throw new Error('FACEIT match not found');
      }
      
      console.log('FACEIT match details retrieved:', match);
      return match;
    },
    enabled: !!matchId,
    staleTime: 60000,
    retry: 1
  });

  useEffect(() => {
    if (error) {
      console.error('Error loading FACEIT match details:', error);
      toast({
        title: "Error loading match details",
        description: "We couldn't load the FACEIT match information. Please try again later.",
        variant: "destructive",
      });
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400 mr-2" />
          <span>Loading FACEIT match details...</span>
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
            <p className="text-xl text-gray-400">FACEIT match details not found.</p>
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
        <div className="space-y-8">
          {/* Match Header */}
          <FaceitMatchHeader match={matchDetails} />
          
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
