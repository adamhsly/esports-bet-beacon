
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trophy, Users, Calendar, Flag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TeamProfileProps {
  team: {
    id: string;
    name: string;
    image_url: string | null;
    country?: string;
    region?: string;
    acronym?: string;
    players?: {
      id: string;
      name: string;
      image_url: string | null;
      role?: string;
      country?: string;
    }[];
    matches?: {
      id: string;
      name: string;
      start_time: string;
      result?: string;
      opponent?: string;
      opponent_image?: string;
    }[];
  };
}

export const TeamProfile: React.FC<TeamProfileProps> = ({ team }) => {
  return (
    <div className="space-y-6">
      <Card className="bg-theme-gray-dark border-theme-gray-medium">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-center pb-2">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <div className="relative">
              <img 
                src={team.image_url || '/placeholder.svg'} 
                alt={team.name} 
                className="w-20 h-20 object-contain bg-theme-gray-medium p-2 rounded-md"
              />
              {team.country && (
                <div className="absolute -bottom-2 -right-2 bg-theme-gray-dark rounded-full p-1 border border-theme-gray-medium">
                  <Flag size={16} className="text-theme-purple" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{team.name}</h2>
              <div className="flex items-center mt-1 text-sm text-gray-400">
                {team.acronym && (
                  <span className="mr-2">{team.acronym}</span>
                )}
                {team.region && (
                  <Badge variant="outline" className="font-normal">
                    {team.region}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-theme-purple">12</div>
              <div className="text-xs text-gray-400">Ranking</div>
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div className="text-center">
              <div className="text-3xl font-bold text-theme-purple">68%</div>
              <div className="text-xs text-gray-400">Win Rate</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <Trophy size={16} className="text-theme-purple mr-2" />
            Recent Achievements
          </h3>
          <div className="space-y-2 mb-6">
            <div className="flex justify-between items-center py-2 px-3 bg-theme-gray-medium/50 rounded">
              <div className="font-medium">IEM Katowice 2023</div>
              <Badge variant="secondary">1st Place</Badge>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-theme-gray-medium/50 rounded">
              <div className="font-medium">BLAST Premier: Spring Finals 2023</div>
              <Badge variant="secondary">3rd-4th Place</Badge>
            </div>
          </div>
          
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <Users size={16} className="text-theme-purple mr-2" />
            Current Roster
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {team.players ? team.players.map(player => (
              <Link to={`/player/${player.id}`} key={player.id} className="flex items-center p-2 bg-theme-gray-medium/50 rounded hover:bg-theme-gray-medium">
                <img 
                  src={player.image_url || '/placeholder.svg'} 
                  alt={player.name} 
                  className="w-10 h-10 object-cover rounded-full"
                />
                <div className="ml-3">
                  <div className="font-medium">{player.name}</div>
                  {player.role && (
                    <div className="text-xs text-gray-400">{player.role}</div>
                  )}
                </div>
              </Link>
            )) : (
              <div className="col-span-2 text-center py-2 text-gray-400">
                No player data available
              </div>
            )}
          </div>
          
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <Calendar size={16} className="text-theme-purple mr-2" />
            Upcoming Matches
          </h3>
          <div className="space-y-2">
            {team.matches ? team.matches.filter(match => new Date(match.start_time) > new Date()).map(match => (
              <Link to={`/match/${match.id}`} key={match.id} className="flex items-center justify-between p-2 bg-theme-gray-medium/50 rounded hover:bg-theme-gray-medium">
                <div>
                  <div className="font-medium">{match.name}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(match.start_time).toLocaleDateString()} at {new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-theme-purple">
                  <ArrowRight size={14} />
                </Button>
              </Link>
            )) : (
              <div className="text-center py-2 text-gray-400">
                No upcoming matches
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamProfile;
