import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { 
  fetchTournamentById, 
  UnifiedTournament, 
  formatPrizePool 
} from '@/lib/tournamentService';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trophy, Calendar, Users, Map } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import TournamentBracket from '@/components/tournament/TournamentBracket';
import LeagueStandings from '@/components/tournament/LeagueStandings';
import { MatchInfo, MatchCard } from '@/components/MatchCard';
import { supabase } from '@/integrations/supabase/client';

const TournamentDetailPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament] = useState<UnifiedTournament | null>(null);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
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
        const tournamentData = await fetchTournamentById(tournamentId);
        if (!tournamentData) {
          throw new Error('Tournament not found');
        }
        setTournament(tournamentData);
        
        // Fetch tournament matches based on source
        const tournamentMatches = await fetchTournamentMatches(tournamentId, tournamentData);
        setMatches(tournamentMatches);
        
      } catch (error) {
        console.error('Error loading tournament data:', error);
        toast({
          title: "Error loading tournament data",
          description: "Could not fetch tournament information. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadTournamentData();
  }, [tournamentId, toast]);

  const fetchTournamentMatches = async (
    tournamentId: string, 
    tournament: UnifiedTournament
  ): Promise<MatchInfo[]> => {
    const [source, id] = tournamentId.split('_', 2);
    let matches: MatchInfo[] = [];

    try {
      switch (source) {
        case 'pandascore':
          const { data: pandaMatches } = await supabase
            .from('pandascore_matches')
            .select('*')
            .eq('tournament_id', id)
            .order('start_time', { ascending: true });

          if (pandaMatches) {
            matches = pandaMatches.map(match => ({
              id: `pandascore_${match.match_id}`,
              teams: [
                {
                  name: (match.teams as any).team1?.name || 'TBD',
                  logo: (match.teams as any).team1?.logo || '/placeholder.svg'
                },
                {
                  name: (match.teams as any).team2?.name || 'TBD',
                  logo: (match.teams as any).team2?.logo || '/placeholder.svg'
                }
              ] as [any, any],
              startTime: match.start_time,
              tournament: match.tournament_name || tournament.name,
              esportType: match.esport_type,
              bestOf: match.number_of_games || 3,
              status: match.status,
              source: 'professional' as const
            }));
          }
          break;

        case 'sportdevs':
          const { data: sportMatches } = await supabase
            .from('sportdevs_matches')
            .select('*')
            .eq('tournament_id', id)
            .order('start_time', { ascending: true });

          if (sportMatches) {
            matches = sportMatches.map(match => ({
              id: `sportdevs_${match.match_id}`,
              teams: [
                {
                  name: (match.teams as any).team1?.name || 'TBD',
                  logo: (match.teams as any).team1?.logo || '/placeholder.svg'
                },
                {
                  name: (match.teams as any).team2?.name || 'TBD',
                  logo: (match.teams as any).team2?.logo || '/placeholder.svg'
                }
              ] as [any, any],
              startTime: match.start_time,
              tournament: match.tournament_name || tournament.name,
              esportType: match.esport_type,
              bestOf: match.best_of || 3,
              status: match.status,
              source: 'professional' as const
            }));
          }
          break;

        case 'faceit':
          const competitionName = id.replace(/_/g, ' ');
          const { data: faceitMatches } = await supabase
            .from('faceit_matches')
            .select('*')
            .eq('competition_name', competitionName)
            .order('scheduled_at', { ascending: true });

          if (faceitMatches) {
            matches = faceitMatches.map(match => ({
              id: `faceit_${match.match_id}`,
              teams: [
                {
                  name: (match.teams as any).team1?.name || 'Team 1',
                  logo: (match.teams as any).team1?.logo || '/placeholder.svg'
                },
                {
                  name: (match.teams as any).team2?.name || 'Team 2',
                  logo: (match.teams as any).team2?.logo || '/placeholder.svg'
                }
              ] as [any, any],
              startTime: match.scheduled_at || match.started_at || new Date().toISOString(),
              tournament: match.competition_name || tournament.name,
              esportType: match.game || 'cs2',
              bestOf: 3,
              status: match.status,
              source: 'amateur' as const,
              faceitData: {
                region: (match.faceit_data as any)?.region,
                competitionType: match.competition_type,
                organizedBy: match.organized_by,
                calculateElo: (match.faceit_data as any)?.calculateElo,
                results: (match.faceit_data as any)?.results
              }
            }));
          }
          break;
      }
    } catch (error) {
      console.error('Error fetching tournament matches:', error);
    }

    return matches;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-400/30';
      case 'upcoming': return 'bg-blue-500/20 text-blue-400 border-blue-400/30';
      case 'finished': return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
      default: return 'bg-theme-purple/20 text-theme-purple border-theme-purple/30';
    }
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

  if (!tournament) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h1 className="text-2xl font-bold mb-2">Tournament Not Found</h1>
            <p className="text-gray-400">The requested tournament could not be found.</p>
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
        {/* Tournament Header */}
        <div className="mb-8 flex flex-col md:flex-row items-center md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <img 
              src={tournament.imageUrl || '/placeholder.svg'} 
              alt={tournament.name} 
              className="w-16 h-16 object-contain mr-4"
            />
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">{tournament.name}</h1>
                <Badge className={getStatusColor(tournament.status)}>
                  {tournament.status.toUpperCase()}
                </Badge>
                {tournament.type === 'league' ? (
                  <Users className="h-5 w-5 text-blue-400" />
                ) : (
                  <Trophy className="h-5 w-5 text-yellow-400" />
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-gray-400">
                {tournament.startDate && tournament.endDate && (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span className="text-sm">
                      {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                {tournament.tier && (
                  <div className="flex items-center">
                    <Map className="h-4 w-4 mr-1" />
                    <span className="text-sm capitalize">{tournament.tier}</span>
                  </div>
                )}
                
                <Badge className="bg-theme-purple">
                  {tournament.esportType.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="text-center md:text-right">
            {tournament.prizePool && (
              <>
                <div className="text-xl font-bold text-theme-purple">
                  {formatPrizePool(tournament.prizePool)}
                </div>
                <p className="text-gray-400">Prize Pool</p>
              </>
            )}
          </div>
        </div>
        
        {tournament.description && (
          <div className="mb-8 bg-theme-gray-dark/50 p-4 rounded-md">
            <p>{tournament.description}</p>
          </div>
        )}
        
        <Tabs defaultValue={tournament.type === 'league' ? 'standings' : 'bracket'} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value={tournament.type === 'league' ? 'standings' : 'bracket'}>
              {tournament.type === 'league' ? 'Standings' : 'Bracket'}
            </TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="info">Information</TabsTrigger>
          </TabsList>
          
          <TabsContent value={tournament.type === 'league' ? 'standings' : 'bracket'} className="pt-6">
            {tournament.type === 'league' ? (
              <LeagueStandings 
                tournamentId={tournament.id}
                tournamentName={tournament.name}
                esportType={tournament.esportType}
              />
            ) : (
              <TournamentBracket 
                matches={matches} 
                tournamentName={tournament.name}
              />
            )}
          </TabsContent>
          
          <TabsContent value="matches" className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.length > 0 ? (
                matches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))
              ) : (
                <div className="col-span-3 text-center py-10 bg-theme-gray-dark/50 rounded-md">
                  <p className="text-gray-400">No match data available for this tournament.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="info" className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-theme-gray-dark/50 p-6 rounded-md">
                <h3 className="text-xl font-bold mb-4">Tournament Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">Type:</span>
                    <span className="ml-2 font-medium capitalize">{tournament.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Game:</span>
                    <span className="ml-2 font-medium uppercase">{tournament.esportType}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Source:</span>
                    <span className="ml-2 font-medium capitalize">{tournament.source}</span>
                  </div>
                  {tournament.tier && (
                    <div>
                      <span className="text-gray-400">Tier:</span>
                      <span className="ml-2 font-medium capitalize">{tournament.tier}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-theme-gray-dark/50 p-6 rounded-md">
                <h3 className="text-xl font-bold mb-4">Statistics</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">Total Matches:</span>
                    <span className="ml-2 font-medium">{matches.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Completed:</span>
                    <span className="ml-2 font-medium">
                      {matches.filter(m => m.status === 'finished' || m.status === 'completed').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Live:</span>
                    <span className="ml-2 font-medium">
                      {matches.filter(m => m.status === 'live' || m.status === 'ongoing').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Upcoming:</span>
                    <span className="ml-2 font-medium">
                      {matches.filter(m => m.status === 'scheduled' || m.status === 'upcoming').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default TournamentDetailPage;
