
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Award, TrendingUp, Users, DollarSign } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  user_id: string;
  fantasy_team_id: string;
  current_score: number;
  current_rank: number;
  team_name: string;
  total_team_value: number;
  performance_score: number;
}

interface Tournament {
  id: string;
  tournament_name: string;
  status: string;
  start_time: string;
  end_time: string;
  current_participants: number;
  max_participants: number;
  prize_pool: number;
}

export const FantasyLeaderboard: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchLeaderboard(selectedTournament);
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('is_fantasy_league', true)
        .order('start_time', { ascending: false });

      if (error) throw error;

      setTournaments(data || []);
      if (data && data.length > 0) {
        setSelectedTournament(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (tournamentId: string) => {
    try {
      const { data, error } = await supabase
        .from('fantasy_league_participants')
        .select(`
          *,
          fantasy_teams (
            team_name,
            total_team_value,
            performance_score
          )
        `)
        .eq('tournament_id', tournamentId)
        .order('current_score', { ascending: false });

      if (error) throw error;

      const formattedData: LeaderboardEntry[] = data?.map((participant, index) => ({
        id: participant.id,
        user_id: participant.user_id,
        fantasy_team_id: participant.fantasy_team_id,
        current_score: participant.current_score || 0,
        current_rank: index + 1,
        team_name: participant.fantasy_teams?.team_name || 'Unknown Team',
        total_team_value: participant.fantasy_teams?.total_team_value || 0,
        performance_score: participant.fantasy_teams?.performance_score || 0,
      })) || [];

      setLeaderboard(formattedData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 3:
        return 'bg-gradient-to-r from-amber-400 to-amber-600';
      default:
        return 'bg-theme-gray-medium';
    }
  };

  const selectedTournamentData = tournaments.find(t => t.id === selectedTournament);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-purple"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tournament Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Fantasy Leaderboards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tournaments.map(tournament => (
              <Button
                key={tournament.id}
                variant={selectedTournament === tournament.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTournament(tournament.id)}
              >
                {tournament.tournament_name}
                <Badge className="ml-2" variant="secondary">
                  {tournament.status}
                </Badge>
              </Button>
            ))}
          </div>

          {selectedTournamentData && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  {selectedTournamentData.current_participants} / {selectedTournamentData.max_participants}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  ${selectedTournamentData.prize_pool?.toLocaleString()} Prize Pool
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  {selectedTournamentData.status === 'active' ? 'Live' : 'Upcoming'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(selectedTournamentData.start_time).toLocaleDateString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Current Standings</CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No participants yet in this tournament
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`
                    p-4 rounded-lg border flex items-center justify-between
                    ${index < 3 ? getRankColor(entry.current_rank) + ' text-white' : 'bg-theme-gray-dark border-theme-gray-medium'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(entry.current_rank)}
                      <span className="font-bold">#{entry.current_rank}</span>
                    </div>
                    
                    <div>
                      <div className="font-semibold">{entry.team_name}</div>
                      <div className={`text-sm ${index < 3 ? 'text-white/80' : 'text-gray-500'}`}>
                        Team Value: ${entry.total_team_value.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold">{entry.current_score} pts</div>
                    <div className={`text-sm ${index < 3 ? 'text-white/80' : 'text-gray-500'}`}>
                      Performance: {entry.performance_score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
