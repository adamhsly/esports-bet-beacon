import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar';
import { useRewardsTrack } from '@/hooks/useRewardsTrack';
import { Star, Users, Trophy, ChevronRight, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TeamMatchesModal } from './TeamMatchesModal';

interface PlayerSelectionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
  roundId: string;
}

interface TeamPick {
  team_id: string;
  team_name: string;
  team_type: string;
  current_score: number;
  logo_url?: string;
}

export const PlayerSelectionsModal: React.FC<PlayerSelectionsModalProps> = ({
  open,
  onOpenChange,
  userId,
  username,
  roundId,
}) => {
  const { free, premium } = useRewardsTrack();
  const [loading, setLoading] = useState(true);
  const [teamPicks, setTeamPicks] = useState<TeamPick[]>([]);
  const [starTeamId, setStarTeamId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFrameId, setAvatarFrameId] = useState<string | null>(null);
  const [avatarBorderId, setAvatarBorderId] = useState<string | null>(null);
  const [roundStartDate, setRoundStartDate] = useState<string>('');
  const [roundEndDate, setRoundEndDate] = useState<string>('');
  const [selectedTeamForMatches, setSelectedTeamForMatches] = useState<{
    id: string;
    name: string;
    type: 'pro' | 'amateur';
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetchPlayerSelections();
    }
  }, [open, userId, roundId]);

  const fetchPlayerSelections = async () => {
    setLoading(true);
    try {
      // Fetch round dates
      const { data: roundData } = await supabase
        .from('fantasy_rounds')
        .select('start_date, end_date')
        .eq('id', roundId)
        .single();
      
      if (roundData) {
        setRoundStartDate(roundData.start_date);
        setRoundEndDate(roundData.end_date);
      }

      // Fetch profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, avatar_frame_id, avatar_border_id')
        .eq('id', userId)
        .single();

      if (profile) {
        setAvatarUrl(profile.avatar_url);
        setAvatarFrameId(profile.avatar_frame_id);
        setAvatarBorderId(profile.avatar_border_id);
      }

      // Fetch team picks using RPC to bypass RLS
      const { data: pickData, error: pickError } = await supabase
        .rpc('get_public_user_picks', {
          p_user_id: userId,
          p_round_id: roundId
        }) as { data: Array<{ team_picks: any; star_team_id: string }> | null; error: any };

      if (pickError) {
        console.error('Error fetching picks:', pickError);
        return;
      }

      if (pickData && Array.isArray(pickData) && pickData.length > 0) {
        const picks = pickData[0];
        
        // Fetch scores for each team
        const { data: scores, error: scoresError } = await supabase
          .from('fantasy_round_scores')
          .select('team_id, team_name, team_type, current_score')
          .eq('round_id', roundId)
          .eq('user_id', userId);

        if (scoresError) {
          console.error('Error fetching scores:', scoresError);
          return;
        }

        // Check if we have scores, otherwise fall back to team_picks
        if (!scores || scores.length === 0) {
          // No scores found - use team_picks directly (common for test users)
          const picksFromTeamData = (picks.team_picks || []).map((t: any) => ({
            team_id: t.id || t.team_id,
            team_name: t.name || t.team_name,
            team_type: t.type || t.team_type,
            current_score: 0,
            logo_url: t.logo_url || null
          }));
          
          setTeamPicks(picksFromTeamData);
          setStarTeamId(picks.star_team_id || null);
        } else {
          // Enhance scores with team logos from team_picks jsonb (backwards compatible)
          const enhancedScores = scores.map(score => {
            // Find the team in the picks data to get logo_url (check both old and new formats)
            const teamInPicks = picks.team_picks && Array.isArray(picks.team_picks) 
              ? picks.team_picks.find((t: any) => t.id === score.team_id || t.team_id === score.team_id)
              : null;
            
            return {
              ...score,
              logo_url: teamInPicks?.logo_url || teamInPicks?.team_logo || null
            };
          });

          setTeamPicks(enhancedScores);
          setStarTeamId(picks.star_team_id || null);
        }
      }
    } catch (error) {
      console.error('Error in fetchPlayerSelections:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFrameAsset = () => {
    if (!avatarFrameId) return null;
    const frameReward = [...free, ...premium].find(
      item => item.id === avatarFrameId && item.type === 'frame'
    );
    return frameReward?.assetUrl || null;
  };

  const getBorderAsset = () => {
    if (!avatarBorderId) return null;
    const borderReward = [...free, ...premium].find(
      item => item.id === avatarBorderId && 
      item.value && 
      (item.value.toLowerCase().includes('border') || item.value.toLowerCase().includes('pulse'))
    );
    return borderReward?.assetUrl || null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <EnhancedAvatar
              src={avatarUrl}
              fallback={username.slice(0, 2).toUpperCase()}
              frameUrl={getFrameAsset()}
              borderUrl={getBorderAsset()}
              size="sm"
              className="h-8 w-8"
            />
            <span className="text-white">{username}'s Team</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : teamPicks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No teams selected</p>
          </div>
        ) : (
          <div className="space-y-2 py-4">
            {teamPicks.map((pick) => {
              const isAmateur = pick.team_type === 'faceit' || pick.team_type === 'amateur';
              const isStarred = starTeamId === pick.team_id;
              
              return (
                <Card 
                  key={pick.team_id}
                  onClick={() => setSelectedTeamForMatches({
                    id: pick.team_id,
                    name: pick.team_name,
                    type: isAmateur ? 'amateur' : 'pro'
                  })}
                  className={`relative transition-all cursor-pointer hover:border-gray-500/70 ${
                    isStarred 
                      ? `ring-2 ${isAmateur ? 'ring-orange-400 bg-orange-500/10' : 'ring-blue-400 bg-blue-500/10'} shadow-lg ${isAmateur ? 'shadow-orange-400/20' : 'shadow-blue-400/20'}` 
                      : ''
                  } bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/50`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Team Logo */}
                      <div className={`relative p-2 rounded-lg ${
                        isAmateur 
                          ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30' 
                          : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30'
                      }`}>
                        {pick.logo_url ? (
                          <img src={pick.logo_url} alt={pick.team_name} className="w-8 h-8 object-contain" />
                        ) : isAmateur ? (
                          <Users className="w-8 h-8 text-orange-400" />
                        ) : (
                          <Trophy className="w-8 h-8 text-blue-400" />
                        )}
                      </div>
                      
                      {/* Team Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate text-left">{pick.team_name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            className={`text-xs ${
                              isAmateur 
                                ? 'bg-orange-500/20 text-orange-400 border-orange-400/30' 
                                : 'bg-blue-500/20 text-blue-400 border-blue-400/30'
                            }`}
                          >
                            {isAmateur ? 'Amateur' : 'Pro'}
                          </Badge>
                          {isAmateur && (
                            <Badge className="text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white border-orange-400/50">
                              +25% Bonus
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Fantasy Points & Click indicator */}
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="font-bold text-lg text-blue-400">
                            {pick.current_score}
                          </div>
                          <div className="text-xs text-gray-400">pts</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                    
                    {/* Star Team Double Points Label */}
                    {isStarred && (
                      <div className="mt-2 pt-2 border-t border-gray-600/50">
                        <div className="text-xs text-[#F5C042] font-medium flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          DOUBLE POINTS
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">Total Score</p>
                <p className="text-2xl font-bold">
                  {teamPicks.reduce((sum, pick) => {
                    const score = pick.current_score;
                    const multiplier = starTeamId === pick.team_id ? 2 : 1;
                    return sum + (score * multiplier);
                  }, 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Team Matches Modal */}
      <TeamMatchesModal
        isOpen={!!selectedTeamForMatches}
        onClose={() => setSelectedTeamForMatches(null)}
        team={selectedTeamForMatches}
        roundStartDate={roundStartDate}
        roundEndDate={roundEndDate}
      />
    </Dialog>
  );
};
