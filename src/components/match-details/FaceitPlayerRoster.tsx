
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Star, Users } from 'lucide-react';

interface FaceitPlayer {
  player_id: string;
  nickname: string;
  avatar?: string;
  skill_level?: number;
  membership?: string;
  elo?: number;
  games?: number;
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

const getMembershipColor = (membership: string): string => {
  switch (membership?.toLowerCase()) {
    case 'premium':
      return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
    case 'plus':
      return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
    default:
      return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
  }
};

const PlayerCard: React.FC<{ player: FaceitPlayer; teamName: string }> = ({ player, teamName }) => {
  console.log('🎮 Rendering player card with real data:', player);
  
  // Use real data from the database
  const skillLevel = player.skill_level || 1;
  const membershipTier = player.membership || 'free';
  const playerElo = player.elo || 800;
  const gamesPlayed = player.games || 0;
  
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
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
          ) : null}
          <User size={24} className={`text-gray-400 ${player.avatar ? 'hidden' : ''}`} />
        </div>
        
        <div className="flex-1">
          <div className="font-bold text-white">{player.nickname}</div>
          <div className="text-sm text-gray-400">{teamName}</div>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge 
              variant="outline" 
              className={`${getSkillLevelColor(skillLevel)} border-current/30 bg-current/10`}
            >
              <Star size={12} className="mr-1" />
              Level {skillLevel}
            </Badge>
            
            <Badge 
              variant="outline" 
              className={getMembershipColor(membershipTier)}
            >
              {membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1)}
            </Badge>
            
            <Badge 
              variant="outline" 
              className="text-purple-400 border-purple-400/30 bg-purple-400/10"
            >
              {playerElo} ELO
            </Badge>
            
            {gamesPlayed > 0 && (
              <Badge 
                variant="outline" 
                className="text-green-400 border-green-400/30 bg-green-400/10"
              >
                {gamesPlayed} games
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export const FaceitPlayerRoster: React.FC<FaceitPlayerRosterProps> = ({ teams }) => {
  console.log('📋 Rendering FACEIT player roster with real data:', teams);
  
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
              <Badge variant="outline" className="text-xs">
                {team.roster?.length || 0} players
              </Badge>
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
                    <p className="text-sm">Player data may not be synced yet</p>
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
