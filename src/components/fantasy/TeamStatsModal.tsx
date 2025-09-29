import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Loader2 } from 'lucide-react';
import { getTeamStats } from '@/lib/stats';

interface TeamStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: {
    id: string;
    name: string;
    logo_url?: string;
  } | null;
}

interface TeamStatsData {
  winRate: number;
  recentForm: string;
  tournamentWins: number;
  totalMatches: number;
}

export const TeamStatsModal: React.FC<TeamStatsModalProps> = ({
  isOpen,
  onClose,
  team
}) => {
  const [stats, setStats] = useState<TeamStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!team?.id) return;
      
      setLoading(true);
      try {
        const teamStats = await getTeamStats(team.id);
        setStats(teamStats);
      } catch (error) {
        console.error('Error fetching team stats:', error);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && team) {
      fetchStats();
    }
  }, [isOpen, team?.id]);

  if (!team) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-theme-gray-dark border-theme-gray-medium">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Team Statistics</DialogTitle>
        </DialogHeader>
        
        <Card className="bg-theme-gray-medium/50 border border-theme-gray-light p-4">
          <div className="flex items-center space-x-3 mb-4">
            <img 
              src={team.logo_url || '/placeholder.svg'} 
              alt={team.name} 
              className="w-8 h-8 object-contain rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <h4 className="text-white font-semibold">{team.name}</h4>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-theme-purple" />
            </div>
          ) : stats ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-blue-400" />
                  <span className="text-gray-300 text-sm">Win Rate</span>
                </div>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/30">
                  {stats.winRate}%
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-gray-300 text-sm">Recent Form</span>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {(stats.recentForm || 'N/A').split('').map((char, index) => (
                    <span
                      key={index}
                      className={`
                        text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center
                        ${char === 'W' ? 'bg-green-500 text-white' : 
                          char === 'L' ? 'bg-red-500 text-white' : 
                          'bg-gray-500 text-white'}
                      `}
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-xs text-gray-400 mt-2">
                Based on {stats.totalMatches} matches (last 6 months)
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-400 text-sm">Win Rate</span>
                </div>
                <Badge className="bg-gray-500/20 text-gray-400 border-gray-400/30">
                  N/A
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-400 text-sm">Recent Form</span>
                </div>
                <span className="text-gray-400 text-sm">No data</span>
              </div>

              <div className="text-xs text-gray-400 mt-2">
                No historical data found
              </div>
            </div>
          )}
        </Card>
      </DialogContent>
    </Dialog>
  );
};