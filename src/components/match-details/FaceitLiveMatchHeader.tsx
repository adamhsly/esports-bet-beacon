
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMatchNotifications } from '@/hooks/useMatchNotifications';
import { Radio, Clock, Trophy, Bell, BellRing, Loader2 } from 'lucide-react';

interface FaceitLiveMatchHeaderProps {
  match: {
    id: string;
    teams: Array<{
      name: string;
      logo?: string;
      avatar?: string;
      roster?: Array<{
        nickname: string;
        player_id: string;
        skill_level?: number;
      }>;
    }>;
    startTime: string;
    competition_name?: string;
    faceitData?: {
      region?: string;
      competitionType?: string;
      calculateElo?: boolean;
      results?: {
        score: {
          faction1: number;
          faction2: number;
        };
      };
    };
    status: string;
  };
}

export const FaceitLiveMatchHeader: React.FC<FaceitLiveMatchHeaderProps> = ({ match }) => {
  const { isSubscribed, isLoading, isChecking, toggleNotification } = useMatchNotifications({
    matchId: match.id,
    matchStartTime: match.startTime
  });

  const team1 = match.teams[0] || { name: 'Team 1' };
  const team2 = match.teams[1] || { name: 'Team 2' };

  const getElapsedTime = () => {
    const startTime = new Date(match.startTime);
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(255,154,62,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(255,154,62,0.4)]">
      <div className="p-6">
        {/* Match Title and Status */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#E8EAF5] mb-2">
              {team1.name} vs {team2.name}
            </h1>
            <div className="flex items-center gap-4 text-[#A8AEBF]">
              <div className="flex items-center">
                <Trophy className="h-4 w-4 mr-2" />
                <span>{match.competition_name || 'FACEIT Match'}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>Live for {getElapsedTime()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-red-500 text-white text-lg px-4 py-2 shadow-[0_0_12px_rgba(255,77,62,0.3)] animate-pulse">
              <Radio className="h-4 w-4 mr-2 animate-pulse" />
              LIVE
            </Badge>
            
            {isChecking ? (
              <Button disabled variant="outline" size="icon">
                <Loader2 className="h-4 w-4 animate-spin" />
              </Button>
            ) : (
              <Button 
                variant={isSubscribed ? "default" : "outline"}
                size="icon"
                className={isSubscribed ? 'bg-theme-purple hover:bg-theme-purple/80' : ''}
                onClick={toggleNotification}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : isSubscribed ? (
                  <BellRing className="h-4 w-4 text-white" />
                ) : (
                  <Bell className="h-4 w-4 text-white" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Teams Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Team 1 */}
          <div className="text-center">
            <img 
              src={team1.logo || team1.avatar || '/placeholder.svg'} 
              alt={team1.name} 
              className="w-24 h-24 object-contain mx-auto mb-3 rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <h3 className="text-xl font-bold text-[#E8EAF5] mb-1">{team1.name}</h3>
            <p className="text-sm text-[#A8AEBF]">
              {team1.roster?.length || 0} players
            </p>
          </div>
          
          {/* VS Section */}
          <div className="text-center">
            <div className="bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] rounded-lg p-4 border border-white/5">
              <div className="text-4xl font-bold text-[#E8EAF5] mb-2">
                {match.faceitData?.results ? (
                  <>
                    <span className="text-theme-purple">{match.faceitData.results.score.faction1}</span>
                    <span className="text-gray-400 mx-2">:</span>
                    <span className="text-theme-purple">{match.faceitData.results.score.faction2}</span>
                  </>
                ) : (
                  '0 : 0'
                )}
              </div>
              <div className="text-sm text-[#A8AEBF]">Current Score</div>
              <div className="mt-2">
                <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-400/30">
                  Map 1 - Live
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Team 2 */}
          <div className="text-center">
            <img 
              src={team2.logo || team2.avatar || '/placeholder.svg'} 
              alt={team2.name} 
              className="w-24 h-24 object-contain mx-auto mb-3 rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <h3 className="text-xl font-bold text-[#E8EAF5] mb-1">{team2.name}</h3>
            <p className="text-sm text-[#A8AEBF]">
              {team2.roster?.length || 0} players
            </p>
          </div>
        </div>

        {/* Match Details */}
        <div className="mt-6 pt-6 border-t border-theme-gray-medium">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-[#A8AEBF]">Date</div>
              <div className="text-[#E8EAF5] font-semibold">
                {match.startTime ? new Date(match.startTime).toLocaleDateString() : 'TBC'}
              </div>
            </div>
            <div>
              <div className="text-sm text-[#A8AEBF]">Start Time</div>
              <div className="text-[#E8EAF5] font-semibold">
                {match.startTime ? new Date(match.startTime).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : 'TBC'}
              </div>
            </div>
            <div>
              <div className="text-sm text-[#A8AEBF]">Region</div>
              <div className="text-[#E8EAF5] font-semibold">{match.faceitData?.region || 'EU'}</div>
            </div>
            <div>
              <div className="text-sm text-[#A8AEBF]">Type</div>
              <div className="text-[#E8EAF5] font-semibold">
                {match.faceitData?.calculateElo ? 'ELO Match' : 'League Match'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
