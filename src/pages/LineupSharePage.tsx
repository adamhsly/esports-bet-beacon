import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Play, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getShareCardUrl } from '@/utils/shareUrlHelper';
import { toast } from 'sonner';

interface LineupData {
  user: {
    username: string;
    avatar_url?: string;
    level: number;
  };
  lineup: Array<{
    id: string;
    name: string;
    type: 'pro' | 'amateur';
    logo_url?: string;
  }>;
  starTeamId?: string;
  roundName: string;
  shareImageUrl: string;
}

export const LineupSharePage: React.FC = () => {
  const { roundId, userId } = useParams();
  const navigate = useNavigate();
  const [lineupData, setLineupData] = useState<LineupData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roundId && userId) {
      fetchLineupData();
    }
  }, [roundId, userId]);

  const fetchLineupData = async () => {
    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      const { data: progress } = await supabase
        .from('user_progress')
        .select('level')
        .eq('user_id', userId)
        .single();

      // Fetch lineup
      const { data: picks } = await supabase
        .from('fantasy_round_picks')
        .select('team_picks')
        .eq('round_id', roundId)
        .eq('user_id', userId)
        .single();

      // Fetch star team
      const { data: starTeam } = await supabase
        .from('fantasy_round_star_teams')
        .select('star_team_id')
        .eq('round_id', roundId)
        .eq('user_id', userId)
        .maybeSingle();

      // Fetch round info
      const { data: round } = await supabase
        .from('fantasy_rounds')
        .select('type')
        .eq('id', roundId)
        .single();

      if (!profile || !picks || !round) {
        throw new Error('Lineup not found');
      }

      const roundName = `${round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round`;
      const shareImageUrl = getShareCardUrl(roundId!, userId!, true);

      setLineupData({
        user: {
          username: profile.username || 'Anonymous',
          avatar_url: undefined,
          level: progress?.level || 1,
        },
        lineup: (picks.team_picks as any) || [],
        starTeamId: starTeam?.star_team_id,
        roundName,
        shareImageUrl,
      });
    } catch (error) {
      console.error('Error fetching lineup data:', error);
      toast.error('Failed to load lineup');
    } finally {
      setLoading(false);
    }
  };

  const starredTeam = lineupData?.lineup.find(team => team.id === lineupData.starTeamId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading lineup...</p>
        </div>
      </div>
    );
  }

  if (!lineupData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Lineup Not Found</h1>
          <p className="text-muted-foreground mb-4">This lineup doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{lineupData.user.username}'s Fantasy Picks — {lineupData.roundName}</title>
        <meta 
          name="description" 
          content={`Star Team: ${starredTeam?.name || 'None'}. Think you can beat this lineup?`}
        />
        <meta property="og:title" content={`${lineupData.user.username}'s Fantasy Picks — ${lineupData.roundName}`} />
        <meta 
          property="og:description" 
          content={`Star Team: ${starredTeam?.name || 'None'}. Think you can beat this lineup?`}
        />
        <meta property="og:image" content={lineupData.shareImageUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${lineupData.user.username}'s Fantasy Picks — ${lineupData.roundName}`} />
        <meta 
          name="twitter:description" 
          content={`Star Team: ${starredTeam?.name || 'None'}. Think you can beat this lineup?`}
        />
        <meta name="twitter:image" content={lineupData.shareImageUrl} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <div className="space-y-6">
            {/* User Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                   <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center overflow-hidden">
                     {lineupData.user.avatar_url ? (
                       <img 
                         src={lineupData.user.avatar_url} 
                         alt={lineupData.user.username}
                         className="w-full h-full object-cover"
                       />
                     ) : (
                       <span className="text-xl font-bold text-white">
                         {lineupData.user.username.charAt(0).toUpperCase()}
                       </span>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{lineupData.user.username}'s Lineup</CardTitle>
                    <p className="text-muted-foreground">
                      {lineupData.roundName} • Level {lineupData.user.level}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Star Team */}
            {starredTeam && (
              <Card className="border-yellow-500/50 bg-yellow-50/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                    <CardTitle className="text-lg">Star Team (Double Points)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {starredTeam.logo_url && (
                      <img 
                        src={starredTeam.logo_url} 
                        alt={starredTeam.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div>
                      <p className="font-semibold">{starredTeam.name}</p>
                      <Badge variant={starredTeam.type === 'pro' ? 'default' : 'secondary'}>
                        {starredTeam.type === 'pro' ? 'Pro' : 'Amateur +25%'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lineup */}
            <Card>
              <CardHeader>
                <CardTitle>Full Lineup ({lineupData.lineup.length}/5 teams)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lineupData.lineup.map((team) => (
                    <div 
                      key={team.id}
                      className={`p-4 rounded-lg border-2 ${
                        team.type === 'pro' 
                          ? 'border-purple-500/50 bg-purple-50/10' 
                          : 'border-orange-500/50 bg-orange-50/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {team.logo_url && (
                          <img 
                            src={team.logo_url} 
                            alt={team.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{team.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant={team.type === 'pro' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {team.type === 'pro' ? 'Pro' : 'Amateur'}
                            </Badge>
                            {team.type === 'amateur' && (
                              <Badge variant="outline" className="text-xs text-orange-600">
                                +25%
                              </Badge>
                            )}
                            {team.id === lineupData.starTeamId && (
                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="bg-gradient-to-r from-purple-600/20 to-orange-600/20 border-purple-500/50">
              <CardContent className="text-center py-8">
                <h2 className="text-2xl font-bold mb-2">Think you can beat this lineup?</h2>
                <p className="text-muted-foreground mb-6">
                  Join the {lineupData.roundName} and compete against {lineupData.user.username}!
                </p>
                <Button 
                  onClick={() => navigate('/')}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Play This Round
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};