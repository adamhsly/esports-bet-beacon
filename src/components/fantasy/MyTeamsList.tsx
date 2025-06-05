
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Trophy, Calendar, Trash2, Play } from 'lucide-react';

interface FantasyTeam {
  id: string;
  team_name: string;
  formation: string;
  active_lineup: any[];
  bench_lineup: any[];
  total_team_value: number;
  team_chemistry_bonus: number;
  created_at: string;
  tournament_id?: string;
}

interface Tournament {
  id: string;
  tournament_name: string;
  league_type: string;
  max_participants: number;
  current_participants: number;
  start_time: string;
  status: string;
}

export const MyTeamsList: React.FC = () => {
  const [teams, setTeams] = useState<FantasyTeam[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<FantasyTeam | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [enteringTournament, setEnteringTournament] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMyTeams();
    fetchAvailableTournaments();
  }, []);

  const fetchMyTeams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('fantasy_teams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error",
        description: "Failed to load your teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('is_fantasy_league', true)
        .eq('status', 'upcoming')
        .order('start_time', { ascending: true });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const deleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('fantasy_teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      setTeams(teams.filter(team => team.id !== teamId));
      toast({
        title: "Success",
        description: "Team deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive",
      });
    }
  };

  const enterTournament = async () => {
    if (!selectedTeam || !selectedTournament) return;

    setEnteringTournament(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user is already in this tournament
      const { data: existingParticipant } = await supabase
        .from('fantasy_league_participants')
        .select('id')
        .eq('tournament_id', selectedTournament)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        toast({
          title: "Already Entered",
          description: "You are already participating in this tournament",
          variant: "destructive",
        });
        return;
      }

      // Add participant to tournament
      const { error: participantError } = await supabase
        .from('fantasy_league_participants')
        .insert({
          tournament_id: selectedTournament,
          user_id: user.id,
          fantasy_team_id: selectedTeam.id,
          joined_at: new Date().toISOString(),
          current_rank: 0,
          current_score: 0
        });

      if (participantError) throw participantError;

      // Update team with tournament ID
      const { error: teamError } = await supabase
        .from('fantasy_teams')
        .update({ tournament_id: selectedTournament })
        .eq('id', selectedTeam.id);

      if (teamError) throw teamError;

      // Update tournament participant count
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('current_participants')
        .eq('id', selectedTournament)
        .single();

      if (tournament) {
        await supabase
          .from('tournaments')
          .update({ 
            current_participants: (tournament.current_participants || 0) + 1
          })
          .eq('id', selectedTournament);
      }

      toast({
        title: "Success!",
        description: "Team entered into tournament successfully",
      });

      fetchMyTeams();
      setSelectedTeam(null);
      setSelectedTournament('');
    } catch (error) {
      console.error('Error entering tournament:', error);
      toast({
        title: "Error",
        description: "Failed to enter tournament",
        variant: "destructive",
      });
    } finally {
      setEnteringTournament(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-purple"></div>
        </CardContent>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">No Fantasy Teams Yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first team in the Team Builder to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Fantasy Teams</h2>
        <Badge variant="outline">
          {teams.length} team{teams.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => (
          <Card key={team.id} className="hover:bg-theme-gray-dark/50 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{team.team_name}</CardTitle>
                {team.tournament_id && (
                  <Badge variant="secondary">
                    <Trophy className="h-3 w-3 mr-1" />
                    Entered
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Formation:</span>
                  <Badge variant="outline">{team.formation}</Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span>Players:</span>
                  <span>{team.active_lineup.length} active, {team.bench_lineup.length} bench</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span>Team Value:</span>
                  <span>${team.total_team_value?.toLocaleString() || 0}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span>Chemistry:</span>
                  <span>+{team.team_chemistry_bonus || 0}</span>
                </div>
                
                <div className="text-xs text-gray-500">
                  Created: {new Date(team.created_at).toLocaleDateString()}
                </div>

                <div className="flex gap-2 mt-4">
                  {!team.tournament_id && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => setSelectedTeam(team)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Enter Tournament
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Enter "{team.team_name}" into Tournament</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Select Tournament:</label>
                            <Select 
                              value={selectedTournament} 
                              onValueChange={setSelectedTournament}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Choose a tournament..." />
                              </SelectTrigger>
                              <SelectContent>
                                {tournaments.map(tournament => (
                                  <SelectItem key={tournament.id} value={tournament.id}>
                                    <div className="flex items-center gap-2">
                                      <span>{tournament.tournament_name}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {tournament.current_participants}/{tournament.max_participants}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              onClick={enterTournament}
                              disabled={!selectedTournament || enteringTournament}
                              className="flex-1"
                            >
                              {enteringTournament ? "Entering..." : "Enter Tournament"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteTeam(team.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
