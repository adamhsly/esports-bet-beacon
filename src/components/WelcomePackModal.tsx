
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Sparkles } from 'lucide-react';
import { PlayerCard } from '@/types/card';

interface WelcomePackModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: PlayerCard[];
  packName: string;
}

const WelcomePackModal: React.FC<WelcomePackModalProps> = ({
  isOpen,
  onClose,
  cards,
  packName
}) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAllCards, setShowAllCards] = useState(false);

  const nextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      setShowAllCards(true);
    }
  };

  const resetModal = () => {
    setCurrentCardIndex(0);
    setShowAllCards(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetModal();
    }
  }, [isOpen]);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500';
      case 'rare': return 'bg-blue-500';
      case 'epic': return 'bg-purple-500';
      case 'legendary': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (!cards.length) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-theme-gray-medium border-theme-gray-light">
        <DialogHeader>
          <DialogTitle className="text-center text-white flex items-center justify-center gap-2">
            <Gift className="w-6 h-6 text-theme-purple" />
            Welcome to EsportsBet.gg!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!showAllCards ? (
            // Show single card reveal
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-gray-300">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">{packName}</span>
                <Sparkles className="w-4 h-4" />
              </div>
              
              <div className="relative">
                <Card className="bg-theme-gray-dark border-2 border-theme-purple mx-auto max-w-xs">
                  <CardContent className="p-4 text-center">
                    <div className="space-y-3">
                      <Badge className={`${getRarityColor(cards[currentCardIndex].rarity)} text-white capitalize`}>
                        {cards[currentCardIndex].rarity}
                      </Badge>
                      
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {cards[currentCardIndex].player_name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {cards[currentCardIndex].team_name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {cards[currentCardIndex].position}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-theme-gray-light p-2 rounded">
                          <div className="text-gray-400">K/D Ratio</div>
                          <div className="text-white font-bold">
                            {cards[currentCardIndex].stats.kd_ratio || 'N/A'}
                          </div>
                        </div>
                        <div className="bg-theme-gray-light p-2 rounded">
                          <div className="text-gray-400">ADR</div>
                          <div className="text-white font-bold">
                            {cards[currentCardIndex].stats.adr || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="text-sm text-gray-400">
                Card {currentCardIndex + 1} of {cards.length}
              </div>

              <Button 
                onClick={nextCard}
                className="w-full bg-theme-purple hover:bg-theme-purple/90"
              >
                {currentCardIndex < cards.length - 1 ? 'Next Card' : 'View All Cards'}
              </Button>
            </div>
          ) : (
            // Show all cards summary
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-white mb-2">
                  Your Starter Collection
                </h3>
                <p className="text-sm text-gray-400">
                  You received {cards.length} cards to start your journey!
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {cards.map((card, index) => (
                  <div key={card.id} className="flex items-center gap-3 p-2 bg-theme-gray-dark rounded">
                    <Badge className={`${getRarityColor(card.rarity)} text-white text-xs`}>
                      {card.rarity.charAt(0).toUpperCase()}
                    </Badge>
                    <div className="flex-1">
                      <div className="text-white font-medium text-sm">{card.player_name}</div>
                      <div className="text-gray-400 text-xs">{card.team_name}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Button 
                onClick={onClose}
                className="w-full bg-theme-purple hover:bg-theme-purple/90"
              >
                Start Playing!
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePackModal;
