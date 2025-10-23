import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar';
import { useRewardsTrack } from '@/hooks/useRewardsTrack';
import { Star } from 'lucide-react';

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

  useEffect(() => {
    if (open) {
      fetchPlayerSelections();
    }
  }, [open, userId, roundId]);

  const fetchPlayerSelections = async () => {
    setLoading(true);
    try {
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
        });

      if (pickError) {
        console.error('Error fetching picks:', pickError);
        return;
      }

      if (pickData && pickData.length > 0) {
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

        setTeamPicks(scores || []);
        setStarTeamId(picks.star_team_id);
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
            <span>{username}'s Team</span>
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
            {teamPicks.map((pick) => (
              <div
                key={pick.team_id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  starTeamId === pick.team_id 
                    ? 'border-yellow-500/50 bg-yellow-500/10' 
                    : 'border-border bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {starTeamId === pick.team_id && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{pick.team_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {pick.team_type === 'pandascore' ? 'Pro Team' : 'Amateur Team'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{pick.current_score}</p>
                  <p className="text-xs text-muted-foreground">pts</p>
                </div>
              </div>
            ))}
            
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
    </Dialog>
  );
};
