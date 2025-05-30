
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import EsportsNavigation from '@/components/EsportsNavigation';
import { MatchCard, MatchInfo, TeamInfo } from '@/components/MatchCard';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApiKey } from '@/components/ApiKeyProvider';
import { memoryCache, getTeamImageUrl } from '@/utils/cacheUtils';
import SEOContentBlock from '@/components/SEOContentBlock';

const EsportPage: React.FC = () => {
  const { esportId = 'csgo' } = useParams<{ esportId: string }>();
  const navigate = useNavigate();
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

  // Handle esport navigation change
  const handleEsportChange = (newEsportId: string) => {
    navigate(`/esports/${newEsportId}`);
  };
  
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
      console.log(`EsportPage: Raw ${status} matches data:`, matchesData);
      const processedMatches = processMatchData(matchesData, esportType);
      console.log(`EsportPage: Processed ${status} matches:`, processedMatches);
      
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
      // Clear existing matches when esport changes
      setLiveMatches([]);
      setUpcomingMatches([]);
      
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
  
  // Process the raw match data into our app's format with proper filtering
  const processMatchData = (matches: any[], esportType: string): MatchInfo[] => {
    // Filter matches based on the selected esport type
    const filteredMatches = matches.filter(match => {
      // First check if videogame slug matches
      if (match.videogame?.slug) {
        const gameSlug = match.videogame.slug.toLowerCase();
        switch (esportType) {
          case 'csgo':
            return gameSlug.includes('cs') || gameSlug.includes('counter-strike');
          case 'lol':
            return gameSlug.includes('league') || gameSlug.includes('lol');
          case 'dota2':
            return gameSlug.includes('dota');
          case 'valorant':
            return gameSlug.includes('valorant');
          case 'overwatch':
            return gameSlug.includes('overwatch');
          case 'rocketleague':
            return gameSlug.includes('rocket') || gameSlug.includes('rl');
          default:
            return false;
        }
      }
      
      // Fallback to class_name matching
      if (match.class_name) {
        const className = match.class_name.toLowerCase();
        switch (esportType) {
          case 'csgo':
            return className.includes('cs') || className.includes('counter');
          case 'lol':
            return className.includes('league') || className.includes('lol');
          case 'dota2':
            return className.includes('dota');
          case 'valorant':
            return className.includes('valorant');
          case 'overwatch':
            return className.includes('overwatch');
          case 'rocketleague':
            return className.includes('rocket');
          default:
            return false;
        }
      }
      
      // If no game info available, exclude from results
      return false;
    });
    
    return filteredMatches.map(match => {
      let teams: TeamInfo[] = [];
      
      if (match.opponents?.length > 0) {
        teams = match.opponents.slice(0, 2).map((opponent: any) => ({
          id: opponent.id || `team-${opponent.name || 'unknown'}`,
          name: opponent.name || 'Unknown Team',
          logo: opponent.hash_image ? `https://images.sportdevs.com/${opponent.hash_image}.png` : null,
          image_url: opponent.image_url || null,
          hash_image: opponent.hash_image || null
        }));
      } else if (match.home_team_name && match.away_team_name) {
        teams = [
          {
            id: match.home_team_id || `team-${match.home_team_name || 'unknown'}`,
            name: match.home_team_name || 'Unknown Team',
            logo: match.home_team_hash_image ? `https://images.sportdevs.com/${match.home_team_hash_image}.png` : null,
            image_url: null,
            hash_image: match.home_team_hash_image || null
          },
          {
            id: match.away_team_id || `team-${match.away_team_name || 'unknown'}`,
            name: match.away_team_name || 'Unknown Team',
            logo: match.away_team_hash_image ? `https://images.sportdevs.com/${match.away_team_hash_image}.png` : null,
            image_url: null,
            hash_image: match.away_team_hash_image || null
          }
        ];
      } else if (match.name) {
        const [team1Name, team2Name] = extractTeamNames(match.name);
        teams = [
          { 
            name: team1Name, 
            logo: null,
            image_url: null,
            hash_image: null,
            id: `team-${team1Name}`
          },
          { 
            name: team2Name, 
            logo: null,
            image_url: null,
            hash_image: null,
            id: `team-${team2Name}`
          }
        ];
      }
      
      while (teams.length < 2) {
        teams.push({
          name: 'Unknown Team',
          logo: null,
          image_url: null,
          hash_image: null,
          id: 'unknown-team'
        });
      }
      
      return {
        id: match.id || 'unknown-match',
        teams: [teams[0], teams[1]],
        startTime: match.start_time || new Date().toISOString(),
        tournament: match.league_name || match.tournament?.name || match.serie?.name || 'Unknown Tournament',
        tournament_name: match.tournament?.name,
        season_name: match.season?.name,
        class_name: match.class_name,
        esportType: esportType,
        bestOf: match.format?.best_of || 1
      };
    });
  };
  
  // SEO content for different esports
  const esportsSEOContent: Record<string, { title: string; paragraphs: string[] }> = {
    csgo: {
      title: "CS:GO Live Scores, Betting Odds & Match Analysis",
      paragraphs: [
        "Get real-time CS:GO live scores from top tournaments including ESL Pro League, BLAST Premier, and IEM events. Our live scoring system provides round-by-round updates, player statistics, and match highlights as they happen.",
        "Compare CS:GO betting odds from leading bookmakers to find the best value for your wagers. Our comprehensive odds comparison covers all major CS:GO competitions, from Valve Majors to regional qualifiers.",
        "Enhance your betting strategy with in-depth CS:GO stats including team performance metrics, player ratings, map win rates, and head-to-head records. Our analytical tools help you make informed predictions for upcoming matches.",
        "Stay updated with the latest CS:GO match predictions from our expert analysts. Our prediction models consider team form, roster changes, map pools, and historical data to provide accurate forecasts for professional matches."
      ]
    },
    lol: {
      title: "League of Legends Live Scores, LCK Standings & Match Odds",
      paragraphs: [
        "Follow League of Legends live scores from major competitions including LCK, LEC, LCS, and international tournaments. Our live scoring features champion selections, objective tracking, and team gold differences throughout each match.",
        "Access up-to-date LCK standings, team rankings, and playoff scenarios for Korea's premier League of Legends competition. Track your favorite teams' performance throughout the regular season and championship points.",
        "Compare League of Legends match odds from top sportsbooks to maximize your betting potential. Our odds tracker covers all professional LoL matches with competitive lines and special markets.",
        "Discover expert LoL esports tips and analysis from our team of professional analysts. Get insights into meta changes, team strategies, and valuable teamfight tactics updates to stay ahead of the competition."
      ]
    },
    dota2: {
      title: "Dota 2 Live Coverage, Tournament Updates & Betting Analysis",
      paragraphs: [
        "Stay connected with Dota 2 live match coverage from The International, Majors, and regional leagues. Our live tracking includes draft phases, real-time gold graphs, and key gameplay moments.",
        "Find the best Dota 2 betting odds from trusted bookmakers, covering all professional tournaments and qualifiers. Compare lines across multiple sportsbooks to maximize your potential returns.",
        "Access comprehensive Dota 2 statistics including hero win rates, player performance metrics, and team drafting patterns. Our analytics platform helps you understand the evolving meta and team strategies.",
        "Get expert Dota 2 predictions and insights from professional analysts who understand the complexity of the game. Our coverage includes tournament previews, match breakdowns, and betting recommendations."
      ]
    },
    valorant: {
      title: "Valorant Live Scores, Tournament Coverage & Match Predictions",
      paragraphs: [
        "Follow Valorant Champions Tour events with our real-time scoring system that tracks round results, economy management, and agent selections throughout each match.",
        "Compare Valorant betting odds from leading sportsbooks, featuring markets for map winners, round handicaps, and outright tournament champions across all VCT events.",
        "Explore detailed Valorant statistics covering team performance on different maps, agent utilization rates, and player impact ratings to inform your match predictions.",
        "Stay updated with professional Valorant analysis covering regional metas, team compositions, and strategic approaches to the game's evolving tactical landscape."
      ]
    },
    overwatch: {
      title: "Overwatch League Live Scores, Team Rankings & Match Analysis",
      paragraphs: [
        "Track Overwatch League matches with live scoring that captures team compositions, ultimate economy, and objective progression throughout competitive play.",
        "Find competitive Overwatch betting odds from established bookmakers, with markets covering match winners, map differentials, and seasonal outcomes for all OWL teams.",
        "Access comprehensive Overwatch statistics including hero pick rates, player specializations, and team success rates on different map types and game modes.",
        "Get expert Overwatch match predictions based on team form, roster strengths, and meta adaptability to help inform your viewing and betting experience."
      ]
    },
    rocketleague: {
      title: "Rocket League Championship Series Scores, Stats & Betting Odds",
      paragraphs: [
        "Follow RLCS matches with our live scoring system that captures goals, assists, saves, and other key metrics throughout each competitive Rocket League series.",
        "Compare Rocket League betting odds across multiple bookmakers, featuring markets for match winners, total goals, and tournament placements for all major events.",
        "Explore detailed Rocket League team statistics including goal differentials, defensive ratings, and overtime performance to better understand competitive matchups.",
        "Access professional analysis of Rocket League tournaments, team dynamics, and individual player performances to enhance your understanding of the esport."
      ]
    }
  };

  // Default content for any esport type not specifically defined
  const defaultSEOContent = {
    title: `${esportId.toUpperCase()} Live Scores, Match Odds & Tournament Coverage`,
    paragraphs: [
      `Follow professional ${esportId.toUpperCase()} matches with our comprehensive live scoring system, tracking all the important metrics and plays as they happen in real-time.`,
      `Compare ${esportId.toUpperCase()} betting odds from leading bookmakers to find the best value for your esports wagers across all major tournaments and competitions.`,
      `Access detailed ${esportId.toUpperCase()} statistics including team performance metrics, player ratings, and historical results to inform your match predictions.`,
      `Stay updated with professional ${esportId.toUpperCase()} analysis, tournament recaps, and betting tips from our team of experienced esports analysts.`
    ]
  };

  // Get the appropriate SEO content based on esport type
  const seoContent = esportsSEOContent[esportId] || defaultSEOContent;
  
  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold font-gaming mb-6">
          <span className="highlight-gradient">{esportId.toUpperCase()}</span> Betting Odds
        </h1>
        
        <EsportsNavigation activeEsport={esportId} onEsportChange={handleEsportChange} />
        
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

            {/* SEO Content Block */}
            <SEOContentBlock
              title={seoContent.title}
              paragraphs={seoContent.paragraphs}
            />
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default EsportPage;
