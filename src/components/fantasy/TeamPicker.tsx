import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, Trophy, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface FantasyRound {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  status: 'open' | 'active' | 'finished';
}

interface Team {
  id: string;
  name: string;
  type: 'pro' | 'amateur';
  matches_in_period?: number;
  logo_url?: string;
  recent_activity?: number;
  esport_type?: string;
}

interface TeamPickerProps {
  round: FantasyRound;
  onBack: () => void;
}

export const TeamPicker: React.FC<TeamPickerProps> = ({ round, onBack }) => {
  const { user } = useAuth();
  const [proTeams, setProTeams] = useState<Team[]>([]);
  const [amateurTeams, setAmateurTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [benchTeam, setBenchTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAvailableTeams();
  }, [round]);

  const fetchAvailableTeams = async () => {
    try {
      setLoading(true);
      
      // Fetch pro teams from Pandascore matches within round period
      const { data: pandaMatches, error: pandaError } = await supabase
        .from('pandascore_matches')
        .select('teams, esport_type')
        .gte('start_time', round.start_date)
        .lte('start_time', round.end_date)
        .not('teams', 'is', null);

      if (pandaError) throw pandaError;

      // Extract unique pro teams with esport type
      const proTeamMap = new Map<string, Team>();
      
      pandaMatches?.forEach(match => {
        if (match.teams && Array.isArray(match.teams)) {
          match.teams.forEach((teamObj: any) => {
            if (teamObj.opponent?.opponent) {
              const team = teamObj.opponent.opponent;
              if (!proTeamMap.has(team.id)) {
                proTeamMap.set(team.id, {
                  id: team.id,
                  name: team.name || team.slug || 'Unknown Team',
                  type: 'pro',
                  logo_url: team.image_url,
                  esport_type: match.esport_type
                });
              }
            }
          });
        }
      });

      const proTeamData = Array.from(proTeamMap.values());

      // Fetch amateur teams from Faceit matches
      const { data: faceitMatches, error: faceitError } = await supabase
        .from('faceit_matches')
        .select('teams')
        .gte('match_date', round.start_date)
        .lte('match_date', round.end_date);

      if (faceitError) throw faceitError;

      // Extract unique amateur teams with recent activity count
      const amateurTeamMap = new Map<string, { name: string; count: number }>();
      
      faceitMatches?.forEach(match => {
        if (match.teams && Array.isArray(match.teams)) {
          match.teams.forEach((team: any) => {
            if (team.name && team.id) {
              const current = amateurTeamMap.get(team.id) || { name: team.name, count: 0 };
              amateurTeamMap.set(team.id, { ...current, count: current.count + 1 });
            }
          });
        }
      });

      const amateurTeamData: Team[] = Array.from(amateurTeamMap.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        type: 'amateur',
        recent_activity: data.count
      }));

      setProTeams(proTeamData);
      setAmateurTeams(amateurTeamData);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Failed to load available teams');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSelect = (team: Team) => {
    if (selectedTeams.find(t => t.id === team.id)) {
      setSelectedTeams(selectedTeams.filter(t => t.id !== team.id));
    } else if (selectedTeams.length < 5) {
      setSelectedTeams([...selectedTeams, team]);
    } else {
      toast.error('You can only select up to 5 teams');
    }
  };

  const handleBenchSelect = (team: Team) => {
    if (team.type !== 'amateur') {
      toast.error('Bench team must be an amateur team');
      return;
    }
    setBenchTeam(benchTeam?.id === team.id ? null : team);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please log in to submit your team');
      return;
    }

    if (selectedTeams.length !== 5) {
      toast.error('Please select exactly 5 teams');
      return;
    }

    try {
      setSubmitting(true);

      // Need to convert team objects to plain objects for Supabase
      const teamPicksData = selectedTeams.map(team => ({
        id: team.id,
        name: team.name,
        type: team.type,
        logo_url: team.logo_url
      }));
      
      const benchTeamData = benchTeam ? {
        id: benchTeam.id, 
        name: benchTeam.name,
        type: benchTeam.type
      } : null;
      
      const { error } = await supabase
        .from('fantasy_round_picks')
        .insert({
          user_id: user.id,
          round_id: round.id,
          team_picks: teamPicksData,
          bench_team: benchTeamData
        });

      if (error) throw error;

      toast.success('Team submitted successfully!');
      onBack();
    } catch (error: any) {
      console.error('Error submitting team:', error);
      if (error.code === '23505') {
        toast.error('You have already submitted a team for this round');
      } else {
        toast.error('Failed to submit team');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const TeamCard: React.FC<{ team: Team; isSelected: boolean; onClick: () => void; showBench?: boolean; isBench?: boolean }> = ({ 
    team, isSelected, onClick, showBench = false, isBench = false 
  }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-theme-purple bg-theme-purple/5' : ''
      } ${isBench ? 'ring-2 ring-orange-500 bg-orange-50' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {team.logo_url && (
              <img src={team.logo_url} alt={team.name} className="w-8 h-8 rounded" />
            )}
            <div>
              <h4 className="font-semibold">{team.name}</h4>
              <div className="flex items-center gap-2">
                <Badge variant={team.type === 'pro' ? 'default' : 'secondary'} className="text-xs">
                  {team.type === 'pro' ? 'Pro' : 'Amateur'}
                </Badge>
                {team.type === 'amateur' && (
                  <Badge variant="outline" className="text-xs">
                    +25% bonus
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {team.type === 'amateur' && team.recent_activity !== undefined && (
              <div className="text-right">
                <div className="text-sm font-medium">{team.recent_activity} matches</div>
                <div className="text-xs text-muted-foreground">in period</div>
                {team.recent_activity < 5 && (
                  <AlertTriangle className="h-4 w-4 text-orange-500 inline ml-1" />
                )}
              </div>
            )}
            {isSelected && <CheckCircle className="h-5 w-5 text-theme-purple" />}
            {isBench && <Badge variant="outline" className="text-xs">Bench</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-theme-purple border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading available teams...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold capitalize">{round.type} Round Team Selection</h2>
          <p className="text-muted-foreground">Select exactly 5 teams (mix pro and amateur). Optionally choose an amateur bench team.</p>
        </div>
      </div>

      {/* Selected Teams Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Selected Teams ({selectedTeams.length}/5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedTeams.length === 0 ? (
            <p className="text-muted-foreground">No teams selected yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedTeams.map(team => (
                <Badge key={team.id} variant="secondary" className="flex items-center gap-1">
                  {team.name}
                  {team.type === 'amateur' && <span className="text-xs text-green-600">+25%</span>}
                </Badge>
              ))}
            </div>
          )}
          {benchTeam && (
            <div className="mt-2">
              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                Bench: {benchTeam.name}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Selection Tabs */}
      <Tabs defaultValue="pro" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pro">Pro Teams ({proTeams.length})</TabsTrigger>
          <TabsTrigger value="amateur">Amateur Teams ({amateurTeams.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pro" className="space-y-4">
          {proTeams.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No pro teams available for this round period</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Select Pro Team</h3>
                <p className="text-sm text-muted-foreground">Choose teams scheduled to play in this period</p>
              </div>
              
              <Select onValueChange={(teamId) => {
                const team = proTeams.find(t => t.id === teamId);
                if (team) handleTeamSelect(team);
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a pro team..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {proTeams.map(team => (
                    <SelectItem 
                      key={team.id} 
                      value={team.id}
                      disabled={!!selectedTeams.find(t => t.id === team.id)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {team.logo_url && (
                          <img 
                            src={team.logo_url} 
                            alt={team.name} 
                            className="w-6 h-6 rounded flex-shrink-0" 
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{team.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {team.esport_type?.toUpperCase()}
                            </Badge>
                            <Badge variant="default" className="text-xs">
                              Pro
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Selected Pro Teams Display */}
              {selectedTeams.filter(t => t.type === 'pro').length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Selected Pro Teams:</h4>
                  <div className="grid gap-2">
                    {selectedTeams.filter(t => t.type === 'pro').map(team => (
                      <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {team.logo_url && (
                            <img src={team.logo_url} alt={team.name} className="w-8 h-8 rounded" />
                          )}
                          <div>
                            <div className="font-medium">{team.name}</div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {team.esport_type?.toUpperCase()}
                              </Badge>
                              <Badge variant="default" className="text-xs">
                                Pro
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleTeamSelect(team)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="amateur" className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">Amateur Team Notice</p>
                <p className="text-sm text-orange-700">
                  Amateur teams earn 25% bonus points but match activity varies. Teams with fewer matches may reduce your total score.
                </p>
              </div>
            </div>
          </div>

          {amateurTeams.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No amateur teams available for this round period</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Main Teams</h3>
                <p className="text-sm text-muted-foreground">Click to add to your team</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {amateurTeams.map(team => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    isSelected={!!selectedTeams.find(t => t.id === team.id)}
                    onClick={() => handleTeamSelect(team)}
                  />
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Bench Team (Optional)</h3>
                  <p className="text-sm text-muted-foreground">Used if main team doesn't play</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {amateurTeams.map(team => (
                    <TeamCard
                      key={`bench-${team.id}`}
                      team={team}
                      isSelected={false}
                      isBench={benchTeam?.id === team.id}
                      onClick={() => handleBenchSelect(team)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={selectedTeams.length !== 5 || submitting}
          className="min-w-[120px]"
        >
          {submitting ? 'Submitting...' : 'Submit Team'}
        </Button>
      </div>
    </div>
  );
};