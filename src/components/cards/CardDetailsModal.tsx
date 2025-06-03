
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PlayerCard as PlayerCardType } from '@/types/card';
import { Zap, Target, TrendingUp, Shield, Award, Calendar } from 'lucide-react';

interface CardDetailsModalProps {
  card: PlayerCardType;
  isOpen: boolean;
  onClose: () => void;
}

export const CardDetailsModal: React.FC<CardDetailsModalProps> = ({ card, isOpen, onClose }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400';
      case 'rare': return 'text-blue-400';
      case 'epic': return 'text-purple-400';
      case 'legendary': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-theme-gray-darkest border-theme-gray">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">
            {card.player_name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Card Visual */}
          <div className="space-y-4">
            {/* Player Card Preview */}
            <div className="bg-gradient-to-br from-theme-gray-dark to-theme-gray-darker rounded-lg p-6 text-center">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-theme-gray to-theme-gray-dark rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4">
                {card.player_name.charAt(0)}
              </div>
              <h3 className="text-xl font-bold text-white">{card.player_name}</h3>
              <p className="text-gray-400">{card.team_name || 'Free Agent'}</p>
              <Badge className={`mt-2 ${getRarityColor(card.rarity)} border-current`} variant="outline">
                {card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)}
              </Badge>
            </div>

            {/* Card Info */}
            <div className="bg-theme-gray-dark rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Card ID:</span>
                <span className="text-white font-mono text-sm">{card.card_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Position:</span>
                <span className="text-white">{card.position || 'Player'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Game:</span>
                <span className="text-white uppercase">{card.game}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Minted:</span>
                <span className="text-white">{formatDate(card.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <Award className="text-theme-accent" size={20} />
              Performance Stats
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-theme-gray-dark rounded-lg p-4 text-center">
                <Zap className="text-yellow-400 mx-auto mb-2" size={24} />
                <div className="text-2xl font-bold text-white">
                  {card.stats.kd_ratio?.toFixed(2) || 'N/A'}
                </div>
                <div className="text-gray-400 text-sm">K/D Ratio</div>
              </div>

              <div className="bg-theme-gray-dark rounded-lg p-4 text-center">
                <Target className="text-red-400 mx-auto mb-2" size={24} />
                <div className="text-2xl font-bold text-white">
                  {card.stats.adr || 'N/A'}
                </div>
                <div className="text-gray-400 text-sm">ADR</div>
              </div>

              <div className="bg-theme-gray-dark rounded-lg p-4 text-center">
                <TrendingUp className="text-green-400 mx-auto mb-2" size={24} />
                <div className="text-2xl font-bold text-white">
                  {card.stats.kills || 0}
                </div>
                <div className="text-gray-400 text-sm">Total Kills</div>
              </div>

              <div className="bg-theme-gray-dark rounded-lg p-4 text-center">
                <Shield className="text-blue-400 mx-auto mb-2" size={24} />
                <div className="text-2xl font-bold text-white">
                  {card.stats.assists || 0}
                </div>
                <div className="text-gray-400 text-sm">Assists</div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="bg-theme-gray-dark rounded-lg p-4">
              <h5 className="font-semibold text-white mb-3">Additional Stats</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Deaths:</span>
                  <span className="text-white">{card.stats.deaths || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Headshots:</span>
                  <span className="text-white">{card.stats.headshots || 0}</span>
                </div>
                {card.metadata.performance_grade && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Performance Grade:</span>
                    <Badge variant="outline" className="text-white border-gray-500">
                      {card.metadata.performance_grade}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Ownership Info */}
            {card.owner_wallet && (
              <div className="bg-theme-gray-dark rounded-lg p-4">
                <h5 className="font-semibold text-white mb-2">Ownership</h5>
                <div className="text-sm">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Calendar size={14} />
                    Owner Wallet:
                  </div>
                  <div className="font-mono text-xs text-white break-all">
                    {card.owner_wallet}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
