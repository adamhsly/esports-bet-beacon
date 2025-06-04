
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayerCard } from './PlayerCard';
import { PlayerCard as PlayerCardType } from '@/types/card';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Zap, Merge, Star } from 'lucide-react';

interface CardEvolutionProps {
  cards: PlayerCardType[];
  onEvolution: (evolvedCard: PlayerCardType) => void;
}

export const CardEvolution: React.FC<CardEvolutionProps> = ({ cards, onEvolution }) => {
  const [selectedCards, setSelectedCards] = useState<PlayerCardType[]>([]);
  const [previewCard, setPreviewCard] = useState<PlayerCardType | null>(null);
  const { toast } = useToast();

  const canEvolve = (cardGroup: PlayerCardType[]) => {
    return cardGroup.length >= 3 && 
           cardGroup.every(card => card.player_name === cardGroup[0].player_name);
  };

  const canFuse = (cardGroup: PlayerCardType[]) => {
    return cardGroup.length === 2 && 
           cardGroup.every(card => card.rarity === cardGroup[0].rarity);
  };

  const evolveCard = (baseCard: PlayerCardType): PlayerCardType => {
    const rarityUpgrade: Record<string, string> = {
      'common': 'rare',
      'rare': 'epic', 
      'epic': 'legendary',
      'legendary': 'legendary' // Max rarity
    };

    return {
      ...baseCard,
      id: `evolved-${Date.now()}`,
      card_id: `evolved-${Date.now()}`,
      rarity: rarityUpgrade[baseCard.rarity] as any,
      stats: {
        ...baseCard.stats,
        kills: Math.round((baseCard.stats.kills || 0) * 1.2),
        assists: Math.round((baseCard.stats.assists || 0) * 1.2),
        adr: Math.round((baseCard.stats.adr || 0) * 1.15),
        kd_ratio: +((baseCard.stats.kd_ratio || 0) * 1.1).toFixed(2)
      },
      metadata: {
        ...baseCard.metadata,
        performance_grade: 'S',
        evolution_level: (baseCard.metadata.evolution_level || 0) + 1
      }
    };
  };

  const fuseCards = (card1: PlayerCardType, card2: PlayerCardType): PlayerCardType => {
    return {
      ...card1,
      id: `fused-${Date.now()}`,
      card_id: `fused-${Date.now()}`,
      player_name: `${card1.player_name} & ${card2.player_name}`,
      stats: {
        kills: Math.round(((card1.stats.kills || 0) + (card2.stats.kills || 0)) * 0.8),
        deaths: Math.round(((card1.stats.deaths || 0) + (card2.stats.deaths || 0)) * 0.7),
        assists: Math.round(((card1.stats.assists || 0) + (card2.stats.assists || 0)) * 0.9),
        adr: Math.round(((card1.stats.adr || 0) + (card2.stats.adr || 0)) / 2),
        kd_ratio: +(((card1.stats.kd_ratio || 0) + (card2.stats.kd_ratio || 0)) / 2).toFixed(2)
      },
      metadata: {
        ...card1.metadata,
        fusion_components: [card1.player_name, card2.player_name],
        performance_grade: 'S+'
      }
    };
  };

  const handleCardSelect = (card: PlayerCardType) => {
    if (selectedCards.includes(card)) {
      setSelectedCards(prev => prev.filter(c => c.id !== card.id));
    } else if (selectedCards.length < 3) {
      setSelectedCards(prev => [...prev, card]);
    }
  };

  const generatePreview = () => {
    if (canEvolve(selectedCards)) {
      setPreviewCard(evolveCard(selectedCards[0]));
    } else if (canFuse(selectedCards)) {
      setPreviewCard(fuseCards(selectedCards[0], selectedCards[1]));
    }
  };

  const executeEvolution = () => {
    if (!previewCard) return;

    onEvolution(previewCard);
    toast({
      title: "Evolution Successful!",
      description: `Created ${previewCard.player_name} (${previewCard.rarity})`,
    });

    setSelectedCards([]);
    setPreviewCard(null);
  };

  const duplicateGroups = cards.reduce((acc, card) => {
    if (!acc[card.player_name]) acc[card.player_name] = [];
    acc[card.player_name].push(card);
    return acc;
  }, {} as Record<string, PlayerCardType[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Card Evolution & Fusion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-theme-gray-dark p-4 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Star className="h-4 w-4" />
                Evolution (3+ same player)
              </h3>
              <p className="text-sm text-gray-400">
                Combine 3+ cards of the same player to evolve to higher rarity
              </p>
            </div>
            <div className="bg-theme-gray-dark p-4 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Merge className="h-4 w-4" />
                Fusion (2 same rarity)
              </h3>
              <p className="text-sm text-gray-400">
                Fuse 2 cards of same rarity to create a hybrid card
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="outline">
              Selected: {selectedCards.length}/3
            </Badge>
            {selectedCards.length >= 2 && (
              <Button onClick={generatePreview} size="sm">
                <Zap className="h-4 w-4 mr-2" />
                Preview Result
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.id} className="relative">
            <PlayerCard
              card={card}
              onClick={() => handleCardSelect(card)}
              className={selectedCards.includes(card) ? 'ring-2 ring-theme-accent' : ''}
            />
            {selectedCards.includes(card) && (
              <Badge className="absolute -top-2 -right-2 bg-theme-accent">
                {selectedCards.indexOf(card) + 1}
              </Badge>
            )}
          </div>
        ))}
      </div>

      {/* Evolution Preview */}
      {previewCard && (
        <Card>
          <CardHeader>
            <CardTitle>Evolution Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <PlayerCard card={previewCard} />
            </div>
            <div className="flex justify-center gap-4">
              <Button onClick={() => setPreviewCard(null)} variant="outline">
                Cancel
              </Button>
              <Button onClick={executeEvolution} className="bg-theme-accent">
                Confirm Evolution
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evolution Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle>Evolution Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(duplicateGroups)
              .filter(([_, cards]) => cards.length >= 3)
              .map(([playerName, playerCards]) => (
                <div key={playerName} className="flex items-center justify-between p-3 bg-theme-gray-dark rounded-lg">
                  <div>
                    <span className="font-semibold">{playerName}</span>
                    <span className="text-gray-400 ml-2">({playerCards.length} cards)</span>
                  </div>
                  <Badge variant="outline">
                    Can Evolve to {playerCards[0].rarity === 'legendary' ? 'Legendary+' : 
                      playerCards[0].rarity === 'epic' ? 'Legendary' :
                      playerCards[0].rarity === 'rare' ? 'Epic' : 'Rare'}
                  </Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
