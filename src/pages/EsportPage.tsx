import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import EsportsNavigation from '@/components/EsportsNavigation';
import { MatchCard, MatchInfo, TeamInfo } from '@/components/MatchCard';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApiKey } from '@/components/ApiKeyProvider';
import { memoryCache } from '@/utils/cacheUtils';

const EsportPage: React.FC = () => {
  const { esportId = 'csgo' } = useParams<{ esportId: string }>();
  const [liveMatches, setLiveMatches] = useState<MatchInfo[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { sportDevsApiKey } = useApiKey();
  
  // Use ref to avoid dependency issues with the interval
  const esportIdRef = useRef(esportId);
  const apiKeyRef = useRef(sportDevsApiKey);
  
  useEffect(() => {
    esportIdRef.current = esportId;
    apiKeyRef.current = sportDevsApiKey;
  }, [esportId, sportDevsApiKey]);
  
  const fetchMatches = async (status: 'live' | 'upcoming', esportType: string) => {
    // Generate cache key
    const cacheKey = `matches-${status}-${esportType}`;
    
    // Try to get data from cache first
    const cachedData = memoryCache.get<MatchInfo[]>(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }
    
    console.log(`Cache miss for ${cacheKey}, fetching from API...`);
    
    try {
      const response = await fetch(
        `https://esports.sportdevs.com/matches?status_type=eq.${status}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${apiKeyRef.current}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`${status} matches API error: ${response.status}`);
      }
      
      const matchesData = await response.json();
      const processedMatches = processMatchData(matchesData, esportType);
      
      // Cache the results - live matches for 30s, upcoming for 5 min
      const ttl = status === 'live' ? 30 : 300;
      memoryCache.set(cacheKey, processedMatches, ttl);
      
      return processedMatches;
    } catch (error) {
      console.error(`Error fetching ${status} matches:`, error);
      throw error;
    }
  };
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        console.log(`EsportPage: Loading matches for ${esportId}`);
        
        // Fetch both types of matches in parallel
        const [liveFetched, upcomingFetched] = await Promise.all([
          fetchMatches('live', esportId),
          fetchMatches('upcoming', esportId)
        ]);
        
        setLiveMatches(liveFetched);
        setUpcomingMatches(upcomingFetched);
        
        console.log(`EsportPage: Loaded ${liveFetched.length} live and ${upcomingFetched.length} upcoming matches for ${esportId}`);
      } catch (error) {
        console.error('Error loading matches:', error);
        toast({
          title: "Error loading matches",
          description: "Could not fetch match data",
          variant: "destructive",
        });
        
        setLiveMatches([]);
        setUpcomingMatches([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // Set up interval for polling live matches every 30 seconds (reduced frequency to minimize API calls)
    const pollingInterval = setInterval(async () => {
      console.log('Polling for live match updates');
      
      try {
        const liveFetched = await fetchMatches('live', esportIdRef.current);
        setLiveMatches(liveFetched);
      } catch (error) {
        console.error('Error polling live matches:', error);
        // Don't show toast on polling errors to avoid spamming
      }
    }, 30000);
    
    return () => clearInterval(pollingInterval);
  }, [esportId, toast]);
  
  // Extract team names from a match name string formatted as "Team A vs Team B"
  const extractTeamNames = (matchName: string): [string, string] => {
    if (!matchName || !matchName.includes(' vs ')) {
      return ['N/A', 'N/A'];
    }
    
    const parts = matchName.split(' vs ');
    const team1 = parts[0].trim();
    const team2 = parts.length > 1 ? parts[1].trim() : 'N/A';
    
    return [team1, team2];
  };
  
  // Process the raw match data into our app's format
  const processMatchData = (matches: any[], esportType: string): MatchInfo[] => {
    // Filter matches based on the selected esport type
    // This is a simple implementation; in a real app, you'd want more sophisticated filtering
    const filteredMatches = matches.filter(match => {
      if (match.videogame && match.videogame.slug) {
        return match.videogame.slug.includes(esportType.toLowerCase());
      }
      if (match.class_name) {
        const className = match.class_name.toLowerCase();
        if (esportType === 'csgo' && (className.includes('cs') || className.includes('counter'))) return true;
        if (esportType === 'lol' && (className.includes('league') || className.includes('lol'))) return true;
        if (esportType === 'dota2' && className.includes('dota')) return true;
        if (esportType === 'valorant' && className.includes('valorant')) return true;
      }
      // Default: include all matches if we can't determine the type
      return true;
    });
    
    return filteredMatches.map(match => {
      let teams: TeamInfo[] = [];
      
      // First try to get teams from opponents array
      if (match.opponents && match.opponents.length > 0) {
        teams = match.opponents.slice(0, 2).map((opponent: any) => ({
          id: opponent.id || `team-${opponent.name}`,
          name: opponent.name || 'N/A',
          logo: opponent.image_url || '/placeholder.svg',
          hash_image: opponent.hash_image || null
        }));
      } 
      // If no opponents data, extract from match name
      else if (match.name) {
        const [team1Name, team2Name] = extractTeamNames(match.name);
        teams = [
          { name: team1Name, logo: '/placeholder.svg' },
          { name: team2Name, logo: '/placeholder.svg' }
        ];
      }
      
      // Add placeholder team if needed
      while (teams.length < 2) {
        teams.push({
          name: 'N/A',
          logo: '/placeholder.svg'
        });
      }
      
      return {
        id: match.id || 'N/A',
        teams: [teams[0], teams[1]],
        startTime: match.start_time || new Date().toISOString(),
        tournament: match.league_name || match.tournament?.name || match.serie?.name || 'N/A',
        esportType: esportType,
        bestOf: match.format?.best_of || 1
      };
    });
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
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
                <div className="text-center py-10 text-gray-400 bg-theme-gray-dark/50 rounded-md">
                  No live {esportId.toUpperCase()} matches in progress.
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
                <div className="text-center py-10 text-gray-400 bg-theme-gray-dark/50 rounded-md">
                  No upcoming {esportId.toUpperCase()} matches found.
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
