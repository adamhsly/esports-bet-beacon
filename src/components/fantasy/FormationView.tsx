
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
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

interface FormationPosition {
  id: string;
  name: string;
  position: 'IGL' | 'AWPer' | 'Entry Fragger' | 'Support' | 'Lurker';
  required: boolean;
  gridPosition: string;
}

interface FormationViewProps {
  selectedCards: { [key: string]: FantasyCard | null };
  onPositionSelect: (positionId: string) => void;
  onRemovePlayer: (positionId: string) => void;
  selectedPosition: string | null;
}

const CS2_POSITIONS: FormationPosition[] = [
  { id: 'igl', name: 'IGL', position: 'IGL', required: false, gridPosition: 'col-span-1' },
  { id: 'awper', name: 'AWPer', position: 'AWPer', required: false, gridPosition: 'col-span-1' },
  { id: 'entry', name: 'Entry', position: 'Entry Fragger', required: false, gridPosition: 'col-span-1' },
  { id: 'support', name: 'Support', position: 'Support', required: false, gridPosition: 'col-span-1' },
  { id: 'lurker', name: 'Lurker', position: 'Lurker', required: false, gridPosition: 'col-span-1' },
];

export const FormationView: React.FC<FormationViewProps> = ({
  selectedCards,
  onPositionSelect,
  onRemovePlayer,
  selectedPosition
}) => {
  const isMobile = useIsMobile();

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary': return 'bg-yellow-500';
      case 'epic': return 'bg-purple-500';
      case 'rare': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="h-full">
      <CardContent className="p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-center">Team Formation</h3>
        
        <div className={`grid gap-3 md:gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} max-w-md mx-auto`}>
          {CS2_POSITIONS.map((position) => {
            const player = selectedCards[position.id];
            const isSelected = selectedPosition === position.id;
            
            return (
              <div
                key={position.id}
                className={`${isMobile ? 'w-full' : position.gridPosition} relative`}
              >
                <div
                  onClick={() => onPositionSelect(position.id)}
                  className={`
                    min-h-[100px] md:min-h-[120px] p-3 md:p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-theme-purple bg-theme-purple/10' 
                      : 'border-gray-300 hover:border-theme-purple/50'
                    }
                    ${player ? 'bg-theme-gray-dark' : 'bg-gray-50'}
                  `}
                >
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      {position.name}
                    </div>
                    
                    {player ? (
                      <div className="space-y-1 md:space-y-2">
                        <div className="font-semibold text-sm">
                          {player.player_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {player.team_name}
                        </div>
                        <Badge 
                          className={`text-xs ${getRarityColor(player.rarity)}`}
                          variant="secondary"
                        >
                          {player.rarity}
                        </Badge>
                        <div className="text-xs font-medium">
                          ${player.value.toLocaleString()}
                        </div>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemovePlayer(position.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 mt-2 md:mt-4">
                        Tap to select<br/>{position.position}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 md:mt-6 text-center text-sm text-gray-500">
          {isMobile ? 'Tap' : 'Click'} on a position to select players
        </div>
      </CardContent>
    </Card>
  );
};
