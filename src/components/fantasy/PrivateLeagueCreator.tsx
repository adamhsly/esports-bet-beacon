
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Trophy, Calendar, DollarSign, Settings, Share2 } from 'lucide-react';

interface PrivateLeagueCreatorProps {
  onLeagueCreated?: (leagueId: string) => void;
}

export const PrivateLeagueCreator: React.FC<PrivateLeagueCreatorProps> = ({ onLeagueCreated }) => {
  const [formData, setFormData] = useState({
    league_name: '',
    league_description: '',
    league_type: 'private' as 'private' | 'public' | 'friends-only',
    max_participants: 12,
    entry_fee: 0,
    season_start: '',
    season_end: '',
    scoring_config: {
      kills: 2,
      deaths: -1,
      assists: 1,
      adr_multiplier: 0.1,
      mvp_bonus: 5,
      clutch_bonus: 3
    }
  });
  const [loading, setLoading] = useState(false);
  const [createdLeague, setCreatedLeague] = useState<any>(null);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleScoringChange = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      scoring_config: {
        ...prev.scoring_config,
        [field]: value
      }
    }));
  };

  const createLeague = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to create a league",
          variant: "destructive",
        });
        return;
      }

      // For demo purposes, create a mock league object
      const mockLeague = {
        id: 'demo-created-' + Date.now(),
        league_name: formData.league_name,
        league_description: formData.league_description,
        league_type: formData.league_type,
        created_by_user_id: user.id,
        max_participants: formData.max_participants,
        entry_fee: formData.entry_fee,
        season_start: formData.season_start,
        season_end: formData.season_end,
        scoring_config: formData.scoring_config,
        invite_code: Math.random().toString(36).substr(2, 8).toUpperCase(),
        created_at: new Date().toISOString()
      };

      setCreatedLeague(mockLeague);
      onLeagueCreated?.(mockLeague.id);

      toast({
        title: "League Created!",
        description: `${mockLeague.league_name} has been created successfully. Invite code: ${mockLeague.invite_code}`,
      });

    } catch (error) {
      console.error('Error creating league:', error);
      toast({
        title: "Error",
        description: "Failed to create league",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (createdLeague?.invite_code) {
      navigator.clipboard.writeText(createdLeague.invite_code);
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard",
      });
    }
  };

  if (createdLeague) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            League Created Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-theme-gray-dark rounded-lg p-4 border border-theme-gray-medium">
            <h3 className="font-semibold text-lg mb-2">{createdLeague.league_name}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">League Type:</span>
                <Badge className="ml-2">{createdLeague.league_type}</Badge>
              </div>
              <div>
                <span className="text-gray-400">Max Participants:</span>
                <span className="ml-2">{createdLeague.max_participants}</span>
              </div>
              <div>
                <span className="text-gray-400">Entry Fee:</span>
                <span className="ml-2">${createdLeague.entry_fee}</span>
              </div>
              <div>
                <span className="text-gray-400">Season:</span>
                <span className="ml-2">{createdLeague.season_start} - {createdLeague.season_end}</span>
              </div>
            </div>
          </div>

          <div className="bg-theme-purple/10 rounded-lg p-4 border border-theme-purple/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Invite Code</h4>
                <p className="text-sm text-gray-400">Share this code with friends to join your league</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {createdLeague.invite_code}
                </Badge>
                <Button size="sm" onClick={copyInviteCode}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => setCreatedLeague(null)} 
            variant="outline" 
            className="w-full"
          >
            Create Another League
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Create Private League
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="league_name">League Name</Label>
            <Input
              id="league_name"
              value={formData.league_name}
              onChange={(e) => handleInputChange('league_name', e.target.value)}
              placeholder="Enter league name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="league_type">League Type</Label>
            <Select value={formData.league_type} onValueChange={(value) => handleInputChange('league_type', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private (Invite Only)</SelectItem>
                <SelectItem value="public">Public (Anyone Can Join)</SelectItem>
                <SelectItem value="friends-only">Friends Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_participants">Max Participants</Label>
            <Select value={formData.max_participants.toString()} onValueChange={(value) => handleInputChange('max_participants', parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 Teams</SelectItem>
                <SelectItem value="8">8 Teams</SelectItem>
                <SelectItem value="10">10 Teams</SelectItem>
                <SelectItem value="12">12 Teams</SelectItem>
                <SelectItem value="14">14 Teams</SelectItem>
                <SelectItem value="16">16 Teams</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry_fee">Entry Fee ($)</Label>
            <Input
              id="entry_fee"
              type="number"
              value={formData.entry_fee}
              onChange={(e) => handleInputChange('entry_fee', parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="season_start">Season Start</Label>
            <Input
              id="season_start"
              type="date"
              value={formData.season_start}
              onChange={(e) => handleInputChange('season_start', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="season_end">Season End</Label>
            <Input
              id="season_end"
              type="date"
              value={formData.season_end}
              onChange={(e) => handleInputChange('season_end', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="league_description">Description (Optional)</Label>
          <Textarea
            id="league_description"
            value={formData.league_description}
            onChange={(e) => handleInputChange('league_description', e.target.value)}
            placeholder="Describe your league..."
            rows={3}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <Label>Scoring Settings</Label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-theme-gray-dark rounded-lg border border-theme-gray-medium">
            <div className="space-y-2">
              <Label htmlFor="kills">Kills</Label>
              <Input
                id="kills"
                type="number"
                value={formData.scoring_config.kills}
                onChange={(e) => handleScoringChange('kills', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deaths">Deaths</Label>
              <Input
                id="deaths"
                type="number"
                value={formData.scoring_config.deaths}
                onChange={(e) => handleScoringChange('deaths', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assists">Assists</Label>
              <Input
                id="assists"
                type="number"
                value={formData.scoring_config.assists}
                onChange={(e) => handleScoringChange('assists', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adr_multiplier">ADR Multiplier</Label>
              <Input
                id="adr_multiplier"
                type="number"
                step="0.1"
                value={formData.scoring_config.adr_multiplier}
                onChange={(e) => handleScoringChange('adr_multiplier', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mvp_bonus">MVP Bonus</Label>
              <Input
                id="mvp_bonus"
                type="number"
                value={formData.scoring_config.mvp_bonus}
                onChange={(e) => handleScoringChange('mvp_bonus', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clutch_bonus">Clutch Bonus</Label>
              <Input
                id="clutch_bonus"
                type="number"
                value={formData.scoring_config.clutch_bonus}
                onChange={(e) => handleScoringChange('clutch_bonus', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        <Button 
          onClick={createLeague} 
          disabled={loading || !formData.league_name || !formData.season_start || !formData.season_end}
          className="w-full"
        >
          {loading ? "Creating League..." : "Create League"}
        </Button>
      </CardContent>
    </Card>
  );
};
