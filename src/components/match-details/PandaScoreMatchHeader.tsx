
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Clock, MapPin } from 'lucide-react';
import { useMatchNotifications } from '@/hooks/useMatchNotifications';
import { Button } from '@/components/ui/button';
import { Bell, BellRing, Loader2 } from 'lucide-react';

interface PandaScoreMatchHeaderProps {
  match: {
    id: string;
    teams: Array<{
      name: string;
      logo?: string;
      id?: string;
    }>;
    startTime: string;
    tournament?: string;
    esportType: string;
    bestOf?: number;
    status: string;
  };
}

export const PandaScoreMatchHeader: React.FC<PandaScoreMatchHeaderProps> = ({ match }) => {
  const team1 = match.teams[0] || { name: 'Team 1' };
  const team2 = match.teams[1] || { name: 'Team 2' };

  const { isSubscribed, isLoading, isChecking, toggleNotification } = useMatchNotifications({
    matchId: match.id,
    matchStartTime: match.startTime
  });

  const getTimeUntilMatch = () => {
    const startTime = new Date(match.startTime);
    const now = new Date();
    const diffMs = startTime.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.ceil(diffMs / (1000 * 60));
      return diffMinutes > 0 ? `${diffMinutes} minutes` : 'Starting soon';
    }
    return diffHours < 24 ? `${diffHours} hours` : `${Math.ceil(diffHours / 24)} days`;
  };

  const isMatchInPast = () => {
    const startTime = new Date(match.startTime);
    const now = new Date();
    return startTime.getTime() < now.getTime();
  };

  return (
    <Card className="bg-theme-gray-dark border-theme-gray-medium overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="flex items-center">
              <Trophy className="h-4 w-4 mr-2" />
              <span>{match.tournament || 'Professional Match'}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              <span className="uppercase">{match.esportType}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {!isMatchInPast() && (
              <Button 
                size="sm" 
                variant={isSubscribed ? "default" : "outline"} 
                className={`${isSubscribed ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                onClick={toggleNotification}
                disabled={isLoading || isChecking}
              >
                {isLoading || isChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSubscribed ? (
                  <>
                    <BellRing className="h-4 w-4 mr-2" />
                    Subscribed
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Notify Me
                  </>
                )}
              </Button>
            )}
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/30">
              <Clock className="h-3 w-3 mr-1" />
              {getTimeUntilMatch()}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 items-center">
          <div className="text-center">
            <img 
              src={team1.logo || '/placeholder.svg'} 
              alt={team1.name} 
              className="w-20 h-20 object-contain mx-auto mb-4 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <h3 className="text-xl font-bold text-white">{team1.name}</h3>
          </div>
          
          <div className="text-center">
            <div className="bg-theme-gray-medium/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-white mb-2">VS</div>
              <div className="text-sm text-gray-400">Best of {match.bestOf || 3}</div>
            </div>
          </div>
          
          <div className="text-center">
            <img 
              src={team2.logo || '/placeholder.svg'} 
              alt={team2.name} 
              className="w-20 h-20 object-contain mx-auto mb-4 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <h3 className="text-xl font-bold text-white">{team2.name}</h3>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center text-gray-400">
            <Calendar className="h-4 w-4 mr-2" />
            <span>
              {new Date(match.startTime).toLocaleDateString([], { 
                weekday: 'long',
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
