
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, Users, Trophy, MapPin } from 'lucide-react';

interface FaceitMatchHeaderProps {
  match: {
    teams: Array<{
      name: string;
      logo: string;
    }>;
    tournament: string;
    startTime: string;
    faceitData?: {
      region?: string;
      competitionType?: string;
      organizedBy?: string;
      calculateElo?: boolean;
    };
    bestOf?: number;
  };
}

export const FaceitMatchHeader: React.FC<FaceitMatchHeaderProps> = ({ match }) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const { date, time } = formatDateTime(match.startTime);

  return (
    <div className="space-y-4">
      {/* Tournament and Match Type Badges */}
      <div className="flex items-center justify-center gap-3">
        <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-400/30">
          <Users size={16} className="mr-1" />
          FACEIT Amateur
        </Badge>
        {match.faceitData?.calculateElo && (
          <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-400/30">
            ELO Match
          </Badge>
        )}
      </div>

      {/* Teams Display */}
      <div className="grid grid-cols-3 gap-6 items-center">
        {/* Team 1 */}
        <div className="text-center">
          <img 
            src={match.teams[0]?.logo || '/placeholder.svg'} 
            alt={match.teams[0]?.name} 
            className="w-20 h-20 object-contain mx-auto mb-3 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <h2 className="text-xl font-bold text-white">{match.teams[0]?.name}</h2>
        </div>
        
        {/* VS Section */}
        <div className="text-center">
          <div className="bg-theme-gray-medium/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-white mb-2">VS</div>
            <div className="text-sm text-gray-400">Best of {match.bestOf || 1}</div>
          </div>
        </div>
        
        {/* Team 2 */}
        <div className="text-center">
          <img 
            src={match.teams[1]?.logo || '/placeholder.svg'} 
            alt={match.teams[1]?.name} 
            className="w-20 h-20 object-contain mx-auto mb-3 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <h2 className="text-xl font-bold text-white">{match.teams[1]?.name}</h2>
        </div>
      </div>

      {/* Match Information */}
      <div className="flex items-center justify-center gap-6 text-gray-400 flex-wrap">
        <div className="flex items-center">
          <Trophy className="h-4 w-4 mr-2" />
          <span>{match.tournament}</span>
        </div>
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          <span>{date}</span>
        </div>
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          <span>{time}</span>
        </div>
        {match.faceitData?.region && (
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{match.faceitData.region}</span>
          </div>
        )}
      </div>

      {/* Match Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-theme-gray-dark border border-theme-gray-medium p-3 text-center">
          <div className="text-sm text-gray-400 mb-1">Format</div>
          <div className="text-lg font-bold text-orange-400">
            Bo{match.bestOf || 1}
          </div>
        </Card>
        
        <Card className="bg-theme-gray-dark border border-theme-gray-medium p-3 text-center">
          <div className="text-sm text-gray-400 mb-1">Competition Type</div>
          <div className="text-lg font-bold text-white">
            {match.faceitData?.competitionType || 'Competitive'}
          </div>
        </Card>
        
        <Card className="bg-theme-gray-dark border border-theme-gray-medium p-3 text-center">
          <div className="text-sm text-gray-400 mb-1">Organized By</div>
          <div className="text-lg font-bold text-white">
            {match.faceitData?.organizedBy || 'FACEIT'}
          </div>
        </Card>
      </div>
    </div>
  );
};
