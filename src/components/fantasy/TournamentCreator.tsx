
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Calendar, Users, DollarSign } from 'lucide-react';

interface ScoringRules {
  kills: number;
  deaths: number;
  assists: number;
  adr_multiplier: number;
  mvp_bonus: number;
  clutch_bonus: number;
}

export const TournamentCreator: React.FC = () => {
  const [tournamentData, setTournamentData] = useState({
    tournament_name: '',
    tournament_type: 'fantasy_league',
    is_fantasy_league: true,
    league_type: 'public',
    max_participants: 100,
    entry_fee: 0,
    prize_pool: 0,
    start_time: '',
    end_time: '',
    tournament_rules: {
      description: '',
      max_teams_per_user: 1,
      lineup_changes_allowed: true,
      late_registration: true,
    }
  });

  const [scoringRules, setScoringRules] = useState<ScoringRules>({
    kills: 2,
    deaths: -1,
    assists: 1,
    adr_multiplier: 0.1,
    mvp_bonus: 5,
    clutch_bonus: 3,
  });

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: any) => {
    setTournamentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRulesChange = (field: string, value: any) => {
    setTournamentData(prev => ({
      ...prev,
      tournament_rules: {
        ...prev.tournament_rules,
        [field]: value
      }
    }));
  };

  const handleScoringChange = (field: keyof ScoringRules, value: number) => {
    setScoringRules(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!tournamentData.tournament_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Tournament name is required",
        variant: "destructive",
      });
      return false;
    }

    if (!tournamentData.start_time || !tournamentData.end_time) {
      toast({
        title: "Validation Error",
        description: "Start and end times are required",
        variant: "destructive",
      });
      return false;
    }

    if (new Date(tournamentData.start_time) >= new Date(tournamentData.end_time)) {
      toast({
        title: "Validation Error",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return false;
    }

    if (tournamentData.max_participants < 2) {
      toast({
        title: "Validation Error",
        description: "Tournament must allow at least 2 participants",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const createTournament = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to create a tournament",
          variant: "destructive",
        });
        return;
      }

      // Convert ScoringRules to a plain object for JSON storage
      const scoringRulesData: { [key: string]: number } = {
        kills: scoringRules.kills,
        deaths: scoringRules.deaths,
        assists: scoringRules.assists,
        adr_multiplier: scoringRules.adr_multiplier,
        mvp_bonus: scoringRules.mvp_bonus,
        clutch_bonus: scoringRules.clutch_bonus,
      };

      console.log('Creating tournament with data:', {
        ...tournamentData,
        created_by_user_id: user.id,
        scoring_rules: scoringRulesData,
        scoring_system: scoringRulesData,
        status: 'upcoming',
        current_participants: 0,
      });

      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          tournament_name: tournamentData.tournament_name,
          tournament_type: tournamentData.tournament_type,
          league_type: tournamentData.league_type,
          is_fantasy_league: tournamentData.is_fantasy_league,
          max_participants: tournamentData.max_participants,
          current_participants: 0,
          entry_fee: tournamentData.entry_fee,
          prize_pool: tournamentData.prize_pool,
          start_time: tournamentData.start_time,
          end_time: tournamentData.end_time,
          tournament_rules: tournamentData.tournament_rules,
          scoring_rules: scoringRulesData,
          scoring_system: scoringRulesData,
          created_by_user_id: user.id,
          status: 'upcoming',
        })
        .select()
        .single();

      if (error) {
        console.error('Tournament creation error:', error);
        throw error;
      }

      console.log('Tournament created successfully:', data);

      toast({
        title: "Success!",
        description: `Tournament "${tournamentData.tournament_name}" created successfully`,
      });

      // Reset form
      setTournamentData({
        tournament_name: '',
        tournament_type: 'fantasy_league',
        is_fantasy_league: true,
        league_type: 'public',
        max_participants: 100,
        entry_fee: 0,
        prize_pool: 0,
        start_time: '',
        end_time: '',
        tournament_rules: {
          description: '',
          max_teams_per_user: 1,
          lineup_changes_allowed: true,
          late_registration: true,
        }
      });

      setScoringRules({
        kills: 2,
        deaths: -1,
        assists: 1,
        adr_multiplier: 0.1,
        mvp_bonus: 5,
        clutch_bonus: 3,
      });

    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Error",
        description: "Failed to create tournament. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Create Fantasy Tournament
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Tournament Name</Label>
            <Input
              id="name"
              value={tournamentData.tournament_name}
              onChange={(e) => handleInputChange('tournament_name', e.target.value)}
              placeholder="Enter tournament name..."
            />
          </div>

          <div>
            <Label htmlFor="type">League Type</Label>
            <Select
              value={tournamentData.league_type}
              onValueChange={(value) => handleInputChange('league_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="invite_only">Invite Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="participants">Max Participants</Label>
            <Input
              id="participants"
              type="number"
              value={tournamentData.max_participants}
              onChange={(e) => handleInputChange('max_participants', parseInt(e.target.value) || 0)}
              min="2"
              max="1000"
            />
          </div>

          <div>
            <Label htmlFor="entry_fee">Entry Fee ($)</Label>
            <Input
              id="entry_fee"
              type="number"
              value={tournamentData.entry_fee}
              onChange={(e) => handleInputChange('entry_fee', parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>

          <div>
            <Label htmlFor="start_time">Start Time</Label>
            <Input
              id="start_time"
              type="datetime-local"
              value={tournamentData.start_time}
              onChange={(e) => handleInputChange('start_time', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="end_time">End Time</Label>
            <Input
              id="end_time"
              type="datetime-local"
              value={tournamentData.end_time}
              onChange={(e) => handleInputChange('end_time', e.target.value)}
            />
          </div>
        </div>

        {/* Scoring System */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Scoring System</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="kills">Points per Kill</Label>
              <Input
                id="kills"
                type="number"
                value={scoringRules.kills}
                onChange={(e) => handleScoringChange('kills', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="deaths">Points per Death</Label>
              <Input
                id="deaths"
                type="number"
                value={scoringRules.deaths}
                onChange={(e) => handleScoringChange('deaths', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="assists">Points per Assist</Label>
              <Input
                id="assists"
                type="number"
                value={scoringRules.assists}
                onChange={(e) => handleScoringChange('assists', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="adr">ADR Multiplier</Label>
              <Input
                id="adr"
                type="number"
                step="0.01"
                value={scoringRules.adr_multiplier}
                onChange={(e) => handleScoringChange('adr_multiplier', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="mvp">MVP Bonus</Label>
              <Input
                id="mvp"
                type="number"
                value={scoringRules.mvp_bonus}
                onChange={(e) => handleScoringChange('mvp_bonus', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="clutch">Clutch Bonus</Label>
              <Input
                id="clutch"
                type="number"
                value={scoringRules.clutch_bonus}
                onChange={(e) => handleScoringChange('clutch_bonus', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        {/* Tournament Rules */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Tournament Rules</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={tournamentData.tournament_rules.description}
                onChange={(e) => handleRulesChange('description', e.target.value)}
                placeholder="Describe your tournament rules and format..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="max_teams">Max Teams per User</Label>
                <Input
                  id="max_teams"
                  type="number"
                  value={tournamentData.tournament_rules.max_teams_per_user}
                  onChange={(e) => handleRulesChange('max_teams_per_user', parseInt(e.target.value) || 1)}
                  min="1"
                  max="10"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="lineup_changes"
                  checked={tournamentData.tournament_rules.lineup_changes_allowed}
                  onCheckedChange={(checked) => handleRulesChange('lineup_changes_allowed', checked)}
                />
                <Label htmlFor="lineup_changes">Allow Lineup Changes</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="late_registration"
                  checked={tournamentData.tournament_rules.late_registration}
                  onCheckedChange={(checked) => handleRulesChange('late_registration', checked)}
                />
                <Label htmlFor="late_registration">Late Registration</Label>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Tournament Preview</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              <Users className="h-3 w-3 mr-1" />
              {tournamentData.max_participants} participants
            </Badge>
            <Badge variant="outline">
              <DollarSign className="h-3 w-3 mr-1" />
              ${tournamentData.entry_fee} entry
            </Badge>
            <Badge variant="outline">
              <Calendar className="h-3 w-3 mr-1" />
              {tournamentData.league_type}
            </Badge>
            <Badge variant="outline">
              Kills: +{scoringRules.kills}
            </Badge>
            <Badge variant="outline">
              Deaths: {scoringRules.deaths}
            </Badge>
          </div>
        </div>

        <Button 
          onClick={createTournament} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Creating Tournament..." : "Create Tournament"}
        </Button>
      </CardContent>
    </Card>
  );
};
