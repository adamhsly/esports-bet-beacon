
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, TrendingUp, Award, Flag } from 'lucide-react';
import { EnhancedFaceitPlayer } from '@/lib/supabaseFaceitApi';

interface EnhancedFaceitPlayerCardProps {
  player: EnhancedFaceitPlayer;
  isCompact?: boolean;
}

const getSkillLevelColor = (level: number): string => {
  if (level >= 9) return 'bg-red-500';
  if (level >= 7) return 'bg-orange-500';
  if (level >= 5) return 'bg-yellow-500';
  if (level >= 3) return 'bg-green-500';
  return 'bg-gray-500';
};

const getFormColor = (form: string): string => {
  switch (form) {
    case 'excellent': return 'bg-green-500';
    case 'good': return 'bg-blue-500';
    case 'average': return 'bg-yellow-500';
    case 'poor': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getFormIcon = (form: string) => {
  switch (form) {
    case 'excellent': return <TrendingUp className="h-3 w-3" />;
    case 'good': return <Trophy className="h-3 w-3" />;
    case 'average': return <Target className="h-3 w-3" />;
    case 'poor': return <Target className="h-3 w-3" />;
    default: return <Target className="h-3 w-3" />;
  }
};

export const EnhancedFaceitPlayerCard: React.FC<EnhancedFaceitPlayerCardProps> = ({ 
  player, 
  isCompact = false 
}) => {
  if (isCompact) {
    return (
      <div className="flex items-center space-x-3 p-2 bg-theme-gray-dark rounded-lg border border-theme-gray-medium">
        <img 
          src={player.avatar || '/placeholder.svg'} 
          alt={player.nickname}
          className="w-8 h-8 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm truncate">{player.nickname}</span>
            {player.country && (
              <Flag className="h-3 w-3 text-gray-400" />
            )}
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <Badge 
              variant="outline" 
              className={`text-xs px-1 py-0 ${getSkillLevelColor(player.skill_level || 0)}`}
            >
              LVL {player.skill_level || 0}
            </Badge>
            <span className="text-xs text-gray-400">{player.faceit_elo || 0} ELO</span>
            {player.recent_form && player.recent_form !== 'unknown' && (
              <Badge 
                variant="outline" 
                className={`text-xs px-1 py-0 ${getFormColor(player.recent_form)}`}
              >
                {getFormIcon(player.recent_form)}
                <span className="ml-1 capitalize">{player.recent_form}</span>
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-4 bg-theme-gray-dark border-theme-gray-medium">
      <div className="flex items-start space-x-4">
        <img 
          src={player.avatar || '/placeholder.svg'} 
          alt={player.nickname}
          className="w-12 h-12 rounded-full object-cover"
        />
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{player.nickname}</h3>
              <div className="flex items-center space-x-2 mt-1">
                {player.country && (
                  <span className="text-sm text-gray-400 flex items-center">
                    <Flag className="h-4 w-4 mr-1" />
                    {player.country}
                  </span>
                )}
                {player.membership && player.membership !== 'free' && (
                  <Badge variant="outline" className="text-xs">
                    <Award className="h-3 w-3 mr-1" />
                    {player.membership.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <Badge 
                variant="outline" 
                className={`text-sm ${getSkillLevelColor(player.skill_level || 0)}`}
              >
                Level {player.skill_level || 0}
              </Badge>
              <div className="text-lg font-bold mt-1">{player.faceit_elo || 0} ELO</div>
            </div>
          </div>

          {/* Statistics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Matches</div>
              <div className="font-bold">{player.total_matches || 0}</div>
            </div>
            <div>
              <div className="text-gray-400">Win Rate</div>
              <div className="font-bold">{(player.win_rate || 0).toFixed(1)}%</div>
              <Progress 
                value={player.win_rate || 0} 
                className="h-1 mt-1" 
              />
            </div>
            <div>
              <div className="text-gray-400">K/D Ratio</div>
              <div className="font-bold">{(player.avg_kd_ratio || 0).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400">HS%</div>
              <div className="font-bold">{(player.avg_headshots_percent || 0).toFixed(1)}%</div>
            </div>
          </div>

          {/* Recent Form and Streaks */}
          <div className="flex items-center justify-between pt-2 border-t border-theme-gray-medium">
            <div className="flex items-center space-x-3">
              {player.recent_form && player.recent_form !== 'unknown' && (
                <Badge 
                  variant="outline" 
                  className={`${getFormColor(player.recent_form)}`}
                >
                  {getFormIcon(player.recent_form)}
                  <span className="ml-1 capitalize">{player.recent_form} Form</span>
                </Badge>
              )}
              
              {player.current_win_streak && player.current_win_streak > 0 && (
                <Badge variant="outline" className="bg-green-500/20 text-green-400">
                  <Trophy className="h-3 w-3 mr-1" />
                  {player.current_win_streak}W Streak
                </Badge>
              )}
            </div>

            {/* Recent Results */}
            {player.recent_results && player.recent_results.length > 0 && (
              <div className="flex space-x-1">
                {player.recent_results.slice(0, 5).map((result, index) => (
                  <div
                    key={index}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      result === '1' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}
                  >
                    {result === '1' ? 'W' : 'L'}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
