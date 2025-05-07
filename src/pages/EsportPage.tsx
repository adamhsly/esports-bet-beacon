
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import EsportsNavigation from '@/components/EsportsNavigation';
import { MatchCard, MatchInfo } from '@/components/MatchCard';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApiKey } from '@/components/ApiKeyProvider';

const EsportPage: React.FC = () => {
  const { esportId = 'csgo' } = useParams<{ esportId: string }>();
  const [liveMatches, setLiveMatches] = useState<MatchInfo[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { sportDevsApiKey } = useApiKey();
  
  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      try {
        console.log(`EsportPage: Loading matches for ${esportId}`);
        
        // Fetch live matches
        const liveResponse = await fetch(
          `https://esports.sportdevs.com/matches?status_type=eq.live&videogame_id=eq.${mapEsportToId(esportId)}`,
          {
            headers: {
              'x-api-key': sportDevsApiKey,
              'Accept': 'application/json'
            }
          }
        );
        
        if (!liveResponse.ok) {
          throw new Error(`Live matches API error: ${liveResponse.status}`);
        }
        
        const liveMatchesData = await liveResponse.json();
        const processedLiveMatches = processMatchData(liveMatchesData, esportId);
        setLiveMatches(processedLiveMatches);
        console.log(`EsportPage: Loaded ${processedLiveMatches.length} live matches`);
        
        // Fetch upcoming matches
        const upcomingResponse = await fetch(
          `https://esports.sportdevs.com/matches?status_type=eq.upcoming&videogame_id=eq.${mapEsportToId(esportId)}`,
          {
            headers: {
              'x-api-key': sportDevsApiKey,
              'Accept': 'application/json'
            }
          }
        );
        
        if (!upcomingResponse.ok) {
          throw new Error(`Upcoming matches API error: ${upcomingResponse.status}`);
        }
        
        const upcomingMatchesData = await upcomingResponse.json();
        const processedUpcomingMatches = processMatchData(upcomingMatchesData, esportId);
        setUpcomingMatches(processedUpcomingMatches);
        console.log(`EsportPage: Loaded ${processedUpcomingMatches.length} upcoming matches`);
        
      } catch (error) {
        console.error('Error loading matches:', error);
        toast({
          title: "Error loading matches",
          description: "Could not fetch match data",
          variant: "destructive",
        });
        
        // Instead of fallback data, we'll set empty arrays
        setLiveMatches([]);
        setUpcomingMatches([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatches();
  }, [esportId, toast, sportDevsApiKey]);
  
  // Helper function to map esport ID to SportDevs API ID
  const mapEsportToId = (esportId: string): string => {
    const mapping: Record<string, string> = {
      'csgo': '1',
      'lol': '2',
      'dota2': '3',
      'valorant': '4',
      'overwatch': '5',
      'rocketleague': '6'
    };
    
    return mapping[esportId] || '1'; // Default to CS:GO (1)
  };
  
  // Process the raw match data into our app's format
  const processMatchData = (matches: any[], esportType: string): MatchInfo[] => {
    return matches.map(match => {
      // Extract team data
      const teams = match.opponents && match.opponents.length > 0
        ? match.opponents.slice(0, 2).map((opponent: any) => ({
            name: opponent.name || 'N/A',
            logo: opponent.image_url || '/placeholder.svg'
          }))
        : [];
      
      // Add placeholder team if needed
      while (teams.length < 2) {
        teams.push({
          name: 'N/A',
          logo: '/placeholder.svg'
        });
      }
      
      return {
        id: match.id,
        teams: [teams[0], teams[1]],
        startTime: match.start_time || new Date().toISOString(),
        tournament: match.tournament?.name || match.serie?.name || 'N/A',
        esportType: esportType,
        bestOf: match.format?.best_of || 1
      };
    });
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold font-gaming mb-6">
          <span className="highlight-gradient">{esportId.toUpperCase()}</span> Betting Odds
        </h1>
        
        <EsportsNavigation activeEsport={esportId} />
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-theme-purple" />
          </div>
        ) : (
          <>
            <section className="mb-12">
              <h2 className="text-xl font-bold mb-6 text-white">Live Matches</h2>
              {liveMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {liveMatches.map(match => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  No live matches in progress.
                </div>
              )}
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-6 text-white">Upcoming Matches</h2>
              {upcomingMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingMatches.map(match => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  No upcoming matches found.
                </div>
              )}
            </section>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default EsportPage;
