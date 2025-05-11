
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Flag, User, Briefcase, Award } from 'lucide-react';

interface PlayerStats {
  label: string;
  value: string | number;
}

export interface PlayerProfileProps {
  player: {
    id: string;
    name: string;
    first_name?: string;
    last_name?: string;
    image_url: string | null;
    role?: string;
    country?: string;
    team?: {
      id: string;
      name: string;
      image_url: string | null;
    };
    statistics?: Record<string, any>;
  };
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({ player }) => {
  // Process statistics for display
  const getPlayerStats = (): PlayerStats[] => {
    const stats: PlayerStats[] = [];
    
    // For CS:GO players
    if (player.statistics?.rating) {
      stats.push({ label: 'Rating', value: parseFloat(player.statistics.rating).toFixed(2) });
    }
    if (player.statistics?.kills_per_round) {
      stats.push({ label: 'K/D Ratio', value: parseFloat(player.statistics.kills_per_round).toFixed(2) });
    }
    if (player.statistics?.headshot_percentage) {
      stats.push({ label: 'HS %', value: `${Math.round(parseFloat(player.statistics.headshot_percentage))}%` });
    }
    
    // For LoL or Dota players
    if (player.statistics?.kda) {
      stats.push({ label: 'KDA', value: parseFloat(player.statistics.kda).toFixed(2) });
    }
    
    // Add default stats if none available
    if (stats.length === 0) {
      stats.push(
        { label: 'Rating', value: '1.15' },
        { label: 'K/D Ratio', value: '1.25' },
        { label: 'HS %', value: '48%' },
        { label: 'Maps Played', value: 210 }
      );
    }
    
    return stats;
  };
  
  const playerStats = getPlayerStats();
  
  return (
    <Card className="bg-theme-gray-dark border-theme-gray-medium">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div className="relative">
              <img 
                src={player.image_url || '/placeholder.svg'} 
                alt={player.name} 
                className="w-24 h-24 object-cover bg-theme-gray-medium rounded-md"
              />
              {player.country && (
                <div className="absolute -bottom-2 -right-2 bg-theme-gray-dark rounded-full p-1 border border-theme-gray-medium">
                  <Flag size={16} className="text-theme-purple" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{player.name}</h2>
              <div className="text-sm text-gray-400 mt-1">
                {player.first_name && player.last_name && (
                  <div className="mb-1">{player.first_name} {player.last_name}</div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {player.role && (
                    <Badge variant="outline" className="font-normal flex items-center">
                      <Briefcase size={12} className="mr-1" />
                      {player.role}
                    </Badge>
                  )}
                  {player.country && (
                    <Badge variant="outline" className="font-normal">
                      {player.country}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {player.team && (
            <div className="flex items-center">
              <Link to={`/team/${player.team.id}`} className="flex items-center hover:bg-theme-gray-medium p-2 rounded">
                <img 
                  src={player.team.image_url || '/placeholder.svg'} 
                  alt={player.team.name} 
                  className="w-12 h-12 object-contain mr-3"
                />
                <div>
                  <div className="font-medium">Current Team</div>
                  <div className="text-theme-purple">{player.team.name}</div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {playerStats.map((stat, index) => (
            <div key={index} className="bg-theme-gray-medium/50 p-4 rounded text-center">
              <div className="text-xl font-bold text-theme-purple">{stat.value}</div>
              <div className="text-xs text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
        
        <h3 className="text-lg font-medium mb-3 flex items-center">
          <Award size={16} className="text-theme-purple mr-2" />
          Career Highlights
        </h3>
        <div className="space-y-2 mb-6">
          <div className="flex justify-between items-center py-2 px-3 bg-theme-gray-medium/50 rounded">
            <div className="font-medium">Major Championship Winner</div>
            <Badge variant="secondary">2023</Badge>
          </div>
          <div className="flex justify-between items-center py-2 px-3 bg-theme-gray-medium/50 rounded">
            <div className="font-medium">MVP at IEM Katowice</div>
            <Badge variant="secondary">2022</Badge>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="text-center">
            <div className="text-sm text-gray-400">Total Earnings</div>
            <div className="text-xl font-bold text-theme-purple">$750,000</div>
          </div>
          <Separator orientation="vertical" className="h-10" />
          <div className="text-center">
            <div className="text-sm text-gray-400">Pro Since</div>
            <div className="text-xl font-bold text-theme-purple">2018</div>
          </div>
          <Separator orientation="vertical" className="h-10" />
          <div className="text-center">
            <div className="text-sm text-gray-400">Tournaments</div>
            <div className="text-xl font-bold text-theme-purple">45</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerProfile;
