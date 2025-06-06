
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface FantasyCard {
  id: string;
  player_name: string;
  team_name: string;
  position: string;
  rarity: string;
  stats: any;
  value: number;
  chemistry_bonus?: number;
}

interface CardCollectionViewProps {
  availableCards: FantasyCard[];
  selectedPosition: string | null;
  onCardSelect: (card: FantasyCard) => void;
  salaryRemaining: number;
}

const POSITION_MAPPINGS = {
  'igl': ['IGL', 'Player'],
  'awper': ['AWPer', 'Player'],
  'entry': ['Entry Fragger', 'Player'],
  'support': ['Support', 'Player'],
  'lurker': ['Lurker', 'Player'],
};

export const CardCollectionView: React.FC<CardCollectionViewProps> = ({
  availableCards,
  selectedPosition,
  onCardSelect,
  salaryRemaining
}) => {
  const isMobile = useIsMobile();

  const getFilteredCards = () => {
    if (!selectedPosition) return availableCards;
    
    const allowedPositions = POSITION_MAPPINGS[selectedPosition as keyof typeof POSITION_MAPPINGS] || [];
    return availableCards.filter(card => {
      // Allow cards with specific positions or generic "Player" position
      const positionMatches = allowedPositions.includes(card.position) || 
                             card.position === 'Player' || 
                             !card.position || 
                             card.position.trim() === '';
      return positionMatches && card.value <= salaryRemaining;
    });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary': return 'border-yellow-500 bg-yellow-500/10';
      case 'epic': return 'border-purple-500 bg-purple-500/10';
      case 'rare': return 'border-blue-500 bg-blue-500/10';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const filteredCards = getFilteredCards();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 md:pb-6">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <Users className="h-4 w-4 md:h-5 md:w-5" />
          Available Cards
          {selectedPosition && (
            <Badge variant="outline" className="ml-2 text-xs">
              {selectedPosition.toUpperCase()} Position
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {filteredCards.length === 0 ? (
          <div className="text-center py-6 md:py-8">
            <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-gray-400" />
            <p className="text-gray-500 text-sm md:text-base">
              {selectedPosition 
                ? `No cards available for ${selectedPosition.toUpperCase()} position within budget`
                : 'No cards available'
              }
            </p>
          </div>
        ) : (
          <div className={`space-y-2 md:space-y-3 ${isMobile ? 'max-h-[400px]' : 'max-h-[600px]'} overflow-y-auto`}>
            {filteredCards.map((card) => {
              const canAfford = card.value <= salaryRemaining;
              
              return (
                <div
                  key={card.id}
                  className={`
                    p-3 md:p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${getRarityColor(card.rarity)}
                    ${canAfford 
                      ? 'hover:shadow-md hover:scale-[1.02]' 
                      : 'opacity-50 cursor-not-allowed'
                    }
                  `}
                  onClick={() => canAfford && onCardSelect(card)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm mb-1 truncate">
                        {card.player_name}
                      </div>
                      <div className="text-xs text-gray-600 mb-2 truncate">
                        {card.team_name} • {card.position || 'Player'}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                        >
                          {card.rarity}
                        </Badge>
                        {card.stats && (
                          <div className="text-xs text-gray-500">
                            KD: {card.stats.kd_ratio || 'N/A'} | 
                            ADR: {card.stats.adr || 'N/A'}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right ml-2">
                      <div className={`text-sm font-bold ${canAfford ? 'text-green-600' : 'text-red-500'}`}>
                        ${card.value.toLocaleString()}
                      </div>
                      {selectedPosition && (
                        <Button
                          size="sm"
                          className="mt-2 text-xs px-2 py-1 h-auto"
                          disabled={!canAfford}
                        >
                          {canAfford ? 'Select' : 'Too Expensive'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
