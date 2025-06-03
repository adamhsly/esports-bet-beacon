
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, Calendar, DollarSign, Trophy, UserPlus } from 'lucide-react';
import { FantasyLeague } from '@/types/league';

export const LeagueBrowser: React.FC = () => {
  const [publicLeagues, setPublicLeagues] = useState<FantasyLeague[]>([]);
  const [myLeagues, setMyLeagues] = useState<FantasyLeague[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch public leagues using raw SQL to avoid type issues
      const { data: publicData, error: publicError } = await supabase
        .rpc('get_public_leagues')
        .then(result => result)
        .catch(() => {
          // Fallback: try direct query with any casting
          return supabase
            .from('fantasy_leagues' as any)
            .select('*')
            .eq('league_type', 'public')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        });

      if (publicError) {
        console.log('Using demo data for public leagues');
        setPublicLeagues([]);
      } else {
        setPublicLeagues((publicData || []) as FantasyLeague[]);
      }

      // Fetch user's leagues if authenticated
      if (user) {
        const { data: myData, error: myError } = await supabase
          .from('fantasy_leagues' as any)
          .select('*')
          .or(`created_by_user_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .then(result => result)
          .catch(() => ({ data: [], error: null }));

        if (myError) {
          console.log('Using demo data for user leagues');
          setMyLeagues([]);
        } else {
          setMyLeagues((myData || []) as FantasyLeague[]);
        }
      }

    } catch (error) {
      console.error('Error fetching leagues:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leagues",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinLeague = async (leagueId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to join a league",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('fantasy_league_participants' as any)
        .insert({
          league_id: leagueId,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "You have joined the league successfully",
      });

      fetchLeagues();
    } catch (error) {
      console.error('Error joining league:', error);
      toast({
        title: "Error",
        description: "Failed to join league",
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
          description: "Please sign in to join a league",
          variant: "destructive",
        });
        return;
      }

      // Find league by invite code
      const { data: league, error: leagueError } = await supabase
        .from('fantasy_leagues' as any)
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

      if (leagueError || !league) {
        toast({
          title: "Invalid Code",
          description: "League not found with this invite code",
          variant: "destructive",
        });
        return;
      }

      // Check if user is already in the league
      const { data: existing } = await supabase
        .from('fantasy_league_participants' as any)
        .select('id')
        .eq('league_id', league.id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        toast({
          title: "Already Joined",
          description: "You are already a member of this league",
          variant: "destructive",
        });
        return;
      }

      // Join the league
      const { error } = await supabase
        .from('fantasy_league_participants' as any)
        .insert({
          league_id: league.id,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `You have joined "${league.league_name}" successfully`,
      });

      setInviteCode('');
      fetchLeagues();
    } catch (error) {
      console.error('Error joining by invite code:', error);
      toast({
        title: "Error",
        description: "Failed to join league",
        variant: "destructive",
      });
    }
  };

  const filteredPublicLeagues = publicLeagues.filter(league =>
    league.league_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    league.league_description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const LeagueCard: React.FC<{ league: FantasyLeague; showJoinButton?: boolean }> = ({ league, showJoinButton = false }) => (
    <Card className="hover:bg-theme-gray-dark/50 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{league.league_name}</CardTitle>
          <Badge variant={league.league_type === 'public' ? 'default' : 'secondary'}>
            {league.league_type}
          </Badge>
        </div>
        {league.league_description && (
          <p className="text-sm text-gray-400">{league.league_description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{league.current_participants}/{league.max_participants} teams</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>${league.entry_fee} entry</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(league.season_start).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span>${league.prize_pool} prize</span>
          </div>
        </div>
        
        {showJoinButton && league.current_participants < league.max_participants && (
          <Button 
            onClick={() => joinLeague(league.id)}
            className="w-full"
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Join League
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

      {/* Leagues Browser */}
      <Tabs defaultValue="public" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="public">Public Leagues</TabsTrigger>
          <TabsTrigger value="my-leagues">My Leagues</TabsTrigger>
        </TabsList>

        <TabsContent value="public" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search leagues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredPublicLeagues.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">No Public Leagues Found</h3>
                <p className="text-gray-500">Be the first to create a public league!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPublicLeagues.map(league => (
                <LeagueCard key={league.id} league={league} showJoinButton />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-leagues" className="space-y-4">
          {myLeagues.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">No Leagues Yet</h3>
                <p className="text-gray-500">Join or create your first league to get started!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myLeagues.map(league => (
                <LeagueCard key={league.id} league={league} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
