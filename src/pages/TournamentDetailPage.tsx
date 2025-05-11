import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { 
  fetchTournamentById, 
  fetchMatchesByTournamentId, 
  fetchLeagueByName, 
  fetchStandingsByLeagueId,
  MatchInfo
} from '@/lib/sportDevsApi';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BracketView from '@/components/tournament/BracketView';
import StandingsTable, { TeamStanding } from '@/components/tournament/StandingsTable';
import { MatchCard } from '@/components/MatchCard';

const TournamentDetailPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournamentData, setTournamentData] = useState<any>(null);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    async function loadTournamentData() {
      try {
        setLoading(true);
        
        if (!tournamentId) {
          throw new Error('Tournament ID is required');
        }
        
        // Fetch tournament details
        const tournament = await fetchTournamentById(tournamentId);
        setTournamentData(tournament);
        
        // Fetch tournament matches
        const tournamentMatches = await fetchMatchesByTournamentId(tournamentId);
        
        // Process matches to ensure they have exactly 2 teams
        const processedMatches = tournamentMatches.map(match => ({
          ...match,
          teams: match.teams.length >= 2 
            ? [match.teams[0], match.teams[1]] 
            : [
                match.teams[0] || { name: 'TBD', logo: '/placeholder.svg' },
                match.teams[1] || { name: 'TBD', logo: '/placeholder.svg' }
              ]
        }));
        
        setMatches(processedMatches);
        
        // Try to fetch standings via league
        try {
          const league = await fetchLeagueByName(tournament.name);
          if (league && league.id) {
            const leagueStandings = await fetchStandingsByLeagueId(league.id);
            
            // Process standings data
            const processedStandings: TeamStanding[] = leagueStandings.map((standing: any, index: number) => ({
              id: `standing-${index}`,
              position: standing.position || index + 1,
              team: {
                id: standing.team_id || `team-${index}`,
                name: standing.team_name || `Team ${index + 1}`,
                logo: standing.team_logo_url || '/placeholder.svg'
              },
              matches_played: standing.matches_played || 0,
              wins: standing.wins || 0,
              draws: standing.draws || 0,
              losses: standing.losses || 0,
              points: standing.points || 0
            }));
            
            setStandings(processedStandings);
          }
        } catch (error) {
          console.error('Error fetching tournament standings:', error);
          // Generate mock standings if API fails
          generateMockStandings(processedMatches);
        }
        
      } catch (error) {
        console.error('Error loading tournament data:', error);
        toast({
          title: "Error loading tournament data",
          description: "Could not fetch tournament information. Please try again later.",
          variant: "destructive",
        });
        
        // Generate mock tournament data
        generateMockTournamentData();
      } finally {
        setLoading(false);
      }
    }
    
    loadTournamentData();
  }, [tournamentId, toast]);
  
  const generateMockTournamentData = () => {
    const mockTournament = {
      id: tournamentId || '1',
      name: 'ESL Pro League Season 16',
      start_date: '2023-09-01',
      end_date: '2023-10-15',
      prize_pool: '$750,000',
      image_url: '/placeholder.svg',
      location: 'Online, Europe',
      description: 'The ESL Pro League is a professional esports league for Counter-Strike: Global Offensive.'
    };
    
    setTournamentData(mockTournament);
    
    // Generate mock matches
    const teams = [
      { name: 'Team Liquid', logo: '/placeholder.svg' },
      { name: 'Cloud9', logo: '/placeholder.svg' },
      { name: 'FaZe Clan', logo: '/placeholder.svg' },
      { name: 'G2 Esports', logo: '/placeholder.svg' },
      { name: 'Natus Vincere', logo: '/placeholder.svg' },
      { name: 'Astralis', logo: '/placeholder.svg' },
      { name: 'Vitality', logo: '/placeholder.svg' },
      { name: 'ENCE', logo: '/placeholder.svg' }
    ];
    
    const mockMatches: MatchInfo[] = [];
    
    // Generate 7 matches (for a single-elimination bracket with 8 teams)
    for (let i = 0; i < 7; i++) {
      const team1Index = i * 2 % teams.length;
      const team2Index = (i * 2 + 1) % teams.length;
      
      let startDate = new Date();
      // First 4 matches were 5 days ago, next 2 were 2 days ago, final is tomorrow
      if (i < 4) startDate.setDate(startDate.getDate() - 5);
      else if (i < 6) startDate.setDate(startDate.getDate() - 2);
      else startDate.setDate(startDate.getDate() + 1);
      
      mockMatches.push({
        id: `match-${i + 1}`,
        teams: [
          { name: teams[team1Index].name, logo: teams[team1Index].logo },
          { name: teams[team2Index].name, logo: teams[team2Index].logo }
        ],
        startTime: startDate.toISOString(),
        tournament: mockTournament.name,
        esportType: 'csgo',
        bestOf: i < 4 ? 3 : i < 6 ? 3 : 5
      });
    }
    
    setMatches(mockMatches);
    generateMockStandings(mockMatches);
  };
  
  const generateMockStandings = (matchData: MatchInfo[]) => {
    // Extract unique teams from match data
    const uniqueTeams = new Set<string>();
    matchData.forEach(match => {
      uniqueTeams.add(match.teams[0].name);
      uniqueTeams.add(match.teams[1].name);
    });
    
    const teamArray = Array.from(uniqueTeams);
    
    // Generate mock standings
    const mockStandings: TeamStanding[] = teamArray.map((teamName, index) => {
      const teamMatches = matchData.filter(match => 
        match.teams[0].name === teamName || match.teams[1].name === teamName
      );
      
      // Find team logo
      const teamLogo = matchData.find(match => 
        match.teams[0].name === teamName || match.teams[1].name === teamName
      )?.teams[match.teams[0].name === teamName ? 0 : 1].logo || '/placeholder.svg';
      
      // Generate random stats
      const wins = Math.floor(Math.random() * 10) + 1;
      const losses = Math.floor(Math.random() * 5);
      const draws = Math.floor(Math.random() * 3);
      const points = wins * 3 + draws;
      
      return {
        id: `standing-${index}`,
        position: index + 1,
        team: {
          id: `team-${index}`,
          name: teamName,
          logo: teamLogo
        },
        matches_played: wins + losses + draws,
        wins,
        draws,
        losses,
        points
      };
    });
    
    // Sort by points
    mockStandings.sort((a, b) => b.points - a.points);
    
    // Reassign positions after sorting
    mockStandings.forEach((standing, index) => {
      standing.position = index + 1;
    });
    
    setStandings(mockStandings);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-theme-purple mr-2" />
          <span className="text-xl">Loading tournament data...</span>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        {tournamentData ? (
          <>
            <div className="mb-8 flex flex-col md:flex-row items-center md:justify-between">
              <div className="flex items-center mb-4 md:mb-0">
                <img 
                  src={tournamentData.image_url || '/placeholder.svg'} 
                  alt={tournamentData.name} 
                  className="w-16 h-16 object-contain mr-4"
                />
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">{tournamentData.name}</h1>
                  <p className="text-gray-400">
                    {tournamentData.start_date && tournamentData.end_date
                      ? `${new Date(tournamentData.start_date).toLocaleDateString()} - ${new Date(tournamentData.end_date).toLocaleDateString()}`
                      : "Dates not available"}
                    {tournamentData.location ? ` • ${tournamentData.location}` : ""}
                  </p>
                </div>
              </div>
              
              <div className="text-center md:text-right">
                <div className="text-xl font-bold text-theme-purple">{tournamentData.prize_pool || "Prize pool not available"}</div>
                <p className="text-gray-400">Prize Pool</p>
              </div>
            </div>
            
            {tournamentData.description && (
              <div className="mb-8 bg-theme-gray-dark/50 p-4 rounded-md">
                <p>{tournamentData.description}</p>
              </div>
            )}
            
            <Tabs defaultValue="bracket" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bracket">Bracket</TabsTrigger>
                <TabsTrigger value="standings">Standings</TabsTrigger>
                <TabsTrigger value="matches">Matches</TabsTrigger>
              </TabsList>
              
              <TabsContent value="bracket" className="pt-6">
                <BracketView 
                  matches={matches as any} 
                  tournamentName={tournamentData.name}
                />
              </TabsContent>
              
              <TabsContent value="standings" className="pt-6">
                {standings.length > 0 ? (
                  <StandingsTable 
                    standings={standings}
                    title="Group Stage"
                  />
                ) : (
                  <div className="text-center py-10 bg-theme-gray-dark/50 rounded-md">
                    <p className="text-gray-400">No standings data available for this tournament.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="matches" className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matches.length > 0 ? (
                    matches.map(match => (
                      <MatchCard key={match.id} match={match as any} />
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-10 bg-theme-gray-dark/50 rounded-md">
                      <p className="text-gray-400">No match data available for this tournament.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-gray-400">Tournament not found.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TournamentDetailPage;
