
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Star } from 'lucide-react';

interface FaceitPlayer {
  player_id: string;
  nickname: string;
  avatar?: string;
}

interface FaceitPlayerRosterProps {
  teams: Array<{
    name: string;
    logo: string;
    roster?: FaceitPlayer[];
  }>;
}

const getSkillLevelColor = (level: number): string => {
  if (level >= 9) return 'text-red-400';
  if (level >= 7) return 'text-orange-400';
  if (level >= 5) return 'text-yellow-400';
  if (level >= 3) return 'text-green-400';
  return 'text-gray-400';
};

const PlayerCard: React.FC<{ player: FaceitPlayer; teamName: string }> = ({ player, teamName }) => {
  // Generate mock skill level for demo (1-10)
  const skillLevel = Math.floor(Math.random() * 10) + 1;
  const membershipTier = ['Free', 'Plus', 'Premium'][Math.floor(Math.random() * 3)];
  
  return (
    <Card className="bg-theme-gray-dark border border-theme-gray-medium p-4 hover:border-orange-400/50 transition-colors">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full bg-theme-gray-medium flex items-center justify-center overflow-hidden">
          {player.avatar ? (
            <img 
              src={player.avatar} 
              alt={player.nickname}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : (
            <User size={24} className="text-gray-400" />
          )}
          <User size={24} className="text-gray-400 hidden" />
        </div>
        
        <div className="flex-1">
          <div className="font-bold text-white">{player.nickname}</div>
          <div className="text-sm text-gray-400">{teamName}</div>
          
          <div className="flex items-center gap-2 mt-2">
            <Badge 
              variant="outline" 
              className={`${getSkillLevelColor(skillLevel)} border-current/30 bg-current/10`}
            >
              <Star size={12} className="mr-1" />
              Level {skillLevel}
            </Badge>
            
            <Badge 
              variant="outline" 
              className="text-blue-400 border-blue-400/30 bg-blue-400/10"
            >
              {membershipTier}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const FaceitPlayerRoster: React.FC<FaceitPlayerRosterProps> = ({ teams }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white flex items-center">
        <Users className="h-5 w-5 mr-2 text-orange-400" />
        Team Rosters
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {teams.map((team, teamIndex) => (
          <div key={teamIndex} className="space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src={team.logo} 
                alt={team.name}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <h4 className="text-lg font-bold text-white">{team.name}</h4>
            </div>
            
            <div className="space-y-3">
              {team.roster && team.roster.length > 0 ? (
                team.roster.map((player) => (
                  <PlayerCard 
                    key={player.player_id} 
                    player={player} 
                    teamName={team.name}
                  />
                ))
              ) : (
                <Card className="bg-theme-gray-dark border border-theme-gray-medium p-4 text-center">
                  <div className="text-gray-400">
                    <User size={24} className="mx-auto mb-2" />
                    <p>Roster information not available</p>
                    <p className="text-sm">Players will be revealed closer to match time</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
