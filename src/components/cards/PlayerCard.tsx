
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayerCard as PlayerCardType } from '@/types/card';
import { Zap, Target, TrendingUp } from 'lucide-react';

interface PlayerCardProps {
  card: PlayerCardType;
  onClick?: () => void;
  className?: string;
}

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'common': return 'bg-gray-500';
    case 'rare': return 'bg-blue-500';
    case 'epic': return 'bg-purple-500';
    case 'legendary': return 'bg-yellow-500';
    default: return 'bg-gray-500';
  }
};

const getRarityBorder = (rarity: string) => {
  switch (rarity) {
    case 'common': return 'border-gray-400';
    case 'rare': return 'border-blue-400';
    case 'epic': return 'border-purple-400';
    case 'legendary': return 'border-yellow-400';
    default: return 'border-gray-400';
  }
};

export const PlayerCard: React.FC<PlayerCardProps> = ({ card, onClick, className = '' }) => {
  return (
    <Card 
      className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${getRarityBorder(card.rarity)} border-2 ${className}`}
      onClick={onClick}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 ${getRarityColor(card.rarity)}`} />
      
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-lg text-white truncate">{card.player_name}</h3>
            <p className="text-sm text-gray-400">{card.team_name || 'Free Agent'}</p>
          </div>
          <Badge variant="secondary" className={`${getRarityColor(card.rarity)} text-white border-none`}>
            {card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)}
          </Badge>
        </div>

        {/* Player Image Placeholder */}
        <div className="w-full h-32 bg-gradient-to-br from-theme-gray-dark to-theme-gray-darker rounded-lg mb-3 flex items-center justify-center">
          <div className="text-4xl font-bold text-white opacity-50">
            {card.player_name.charAt(0)}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Zap size={14} className="text-yellow-400" />
            <span className="text-gray-300">K/D:</span>
            <span className="text-white font-semibold">
              {card.stats.kd_ratio?.toFixed(2) || 'N/A'}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Target size={14} className="text-red-400" />
            <span className="text-gray-300">ADR:</span>
            <span className="text-white font-semibold">
              {card.stats.adr || 'N/A'}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <TrendingUp size={14} className="text-green-400" />
            <span className="text-gray-300">Kills:</span>
            <span className="text-white font-semibold">
              {card.stats.kills || 0}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-gray-300">Pos:</span>
            <span className="text-white font-semibold">
              {card.position || 'Player'}
            </span>
          </div>
        </div>

        {/* Performance Grade */}
        {card.metadata.performance_grade && (
          <div className="mt-3 text-center">
            <Badge variant="outline" className="text-white border-gray-500">
              Grade: {card.metadata.performance_grade}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
