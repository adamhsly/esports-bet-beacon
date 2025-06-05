
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, Calendar, DollarSign, Trophy, UserPlus } from 'lucide-react';

interface Tournament {
  id: string;
  tournament_name: string;
  tournament_rules?: any;
  league_type: 'public' | 'private' | 'invite_only';
  created_by_user_id: string;
  max_participants: number;
  current_participants: number;
  entry_fee: number;
  prize_pool: number;
  start_time: string;
  end_time: string;
  scoring_config?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const LeagueBrowser: React.FC = () => {
  const [publicTournaments, setPublicTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch public tournaments
      const { data: publicData, error: publicError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('league_type', 'public')
        .eq('is_fantasy_league', true)
        .order('created_at', { ascending: false });

      if (publicError) {
        console.error('Error fetching public tournaments:', publicError);
        // Fall back to demo data if there's an error
        setPublicTournaments([]);
      } else {
        setPublicTournaments(publicData || []);
      }

      // Fetch user's tournaments if authenticated
      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('created_by_user_id', user.id)
          .order('created_at', { ascending: false });

        if (userError) {
          console.error('Error fetching user tournaments:', userError);
          setMyTournaments([]);
        } else {
          setMyTournaments(userData || []);
        }
      }

    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tournaments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinTournament = async (tournamentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to join a tournament",
          variant: "destructive",
        });
        return;
      }

      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('fantasy_league_participants')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        toast({
          title: "Already Joined",
          description: "You are already a participant in this tournament",
          variant: "destructive",
        });
        return;
      }

      // Add user as participant
      const { error: participantError } = await supabase
        .from('fantasy_league_participants')
        .insert({
          tournament_id: tournamentId,
          user_id: user.id,
          joined_at: new Date().toISOString(),
          current_rank: 0,
          current_score: 0
        });

      if (participantError) throw participantError;

      // Update participant count
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({ 
          current_participants: supabase.raw('current_participants + 1')
        })
        .eq('id', tournamentId);

      if (updateError) throw updateError;

      toast({
        title: "Success!",
        description: "You have joined the tournament successfully",
      });

      fetchTournaments();
    } catch (error) {
      console.error('Error joining tournament:', error);
      toast({
        title: "Error",
        description: "Failed to join tournament",
        variant: "destructive",
      });
    }
  };

  const joinByInviteCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to join a tournament",
          variant: "destructive",
        });
        return;
      }

      // For now, just show that invite codes aren't implemented yet
      toast({
        title: "Feature Coming Soon",
        description: "Invite code functionality will be available soon",
        variant: "destructive",
      });

      setInviteCode('');
    } catch (error) {
      console.error('Error joining by invite code:', error);
      toast({
        title: "Error",
        description: "Failed to join tournament",
        variant: "destructive",
      });
    }
  };

  const filteredPublicTournaments = publicTournaments.filter(tournament =>
    tournament.tournament_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tournament.tournament_rules?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const TournamentCard: React.FC<{ tournament: Tournament; showJoinButton?: boolean }> = ({ 
    tournament, 
    showJoinButton = false 
  }) => (
    <Card className="hover:bg-theme-gray-dark/50 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{tournament.tournament_name}</CardTitle>
          <Badge variant={tournament.league_type === 'public' ? 'default' : 'secondary'}>
            {tournament.league_type}
          </Badge>
        </div>
        {tournament.tournament_rules?.description && (
          <p className="text-sm text-gray-400">{tournament.tournament_rules.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{tournament.current_participants}/{tournament.max_participants} teams</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>${tournament.entry_fee} entry</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(tournament.start_time).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span>${tournament.prize_pool} prize</span>
          </div>
        </div>
        
        {showJoinButton && tournament.current_participants < tournament.max_participants && (
          <Button 
            onClick={() => joinTournament(tournament.id)}
            className="w-full"
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Join Tournament
          </Button>
        )}
      </CardContent>
    </Card>
  );

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
      {/* Invite Code Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Join by Invite Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="flex-1"
            />
            <Button onClick={joinByInviteCode} disabled={!inviteCode}>
              Join
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tournaments Browser */}
      <Tabs defaultValue="public" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="public">Public Tournaments</TabsTrigger>
          <TabsTrigger value="my-tournaments">My Tournaments</TabsTrigger>
        </TabsList>

        <TabsContent value="public" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tournaments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredPublicTournaments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">No Public Tournaments Found</h3>
                <p className="text-gray-500">Be the first to create a public tournament!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPublicTournaments.map(tournament => (
                <TournamentCard key={tournament.id} tournament={tournament} showJoinButton />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-tournaments" className="space-y-4">
          {myTournaments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">No Tournaments Yet</h3>
                <p className="text-gray-500">Create your first tournament to get started!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myTournaments.map(tournament => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
