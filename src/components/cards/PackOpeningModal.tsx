
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlayerCard } from './PlayerCard';
import { Pack, PlayerCard as PlayerCardType } from '@/types/card';
import { Gift, Sparkles } from 'lucide-react';

interface PackOpeningModalProps {
  pack: Pack;
  isOpen: boolean;
  onClose: () => void;
  onPackOpened: (cards: PlayerCardType[]) => void;
}

export const PackOpeningModal: React.FC<PackOpeningModalProps> = ({ 
  pack, 
  isOpen, 
  onClose, 
  onPackOpened 
}) => {
  const [isOpening, setIsOpening] = useState(false);
  const [revealedCards, setRevealedCards] = useState<PlayerCardType[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAllCards, setShowAllCards] = useState(false);

  const handleOpenPack = async () => {
    setIsOpening(true);
    
    // Simulate pack opening with animation delay
    setTimeout(() => {
      setRevealedCards(pack.cards_received);
      setShowAllCards(false);
      setCurrentCardIndex(0);
      
      // Auto-reveal cards one by one
      const revealInterval = setInterval(() => {
        setCurrentCardIndex(prev => {
          const next = prev + 1;
          if (next >= pack.cards_received.length) {
            clearInterval(revealInterval);
            setTimeout(() => setShowAllCards(true), 500);
          }
          return next;
        });
      }, 1000);
    }, 2000);
  };

  const handleFinish = () => {
    onPackOpened(revealedCards);
    onClose();
    // Reset state for next opening
    setIsOpening(false);
    setRevealedCards([]);
    setCurrentCardIndex(0);
    setShowAllCards(false);
  };

  const getPackTypeColor = (type: string) => {
    switch (type) {
      case 'starter': return 'from-gray-600 to-gray-800';
      case 'premium': return 'from-blue-600 to-blue-800';
      case 'legendary': return 'from-yellow-600 to-yellow-800';
      case 'special': return 'from-purple-600 to-purple-800';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-theme-gray-darkest border-theme-gray">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl text-center">
            {pack.pack_type.charAt(0).toUpperCase() + pack.pack_type.slice(1)} Pack
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-96 flex flex-col items-center justify-center space-y-6">
          {!isOpening && revealedCards.length === 0 && (
            <>
              {/* Unopened Pack */}
              <div className={`w-48 h-64 bg-gradient-to-br ${getPackTypeColor(pack.pack_type)} rounded-lg flex flex-col items-center justify-center border-2 border-theme-accent shadow-lg`}>
                <Gift size={64} className="text-white mb-4" />
                <div className="text-white text-lg font-bold text-center">
                  {pack.pack_type.charAt(0).toUpperCase() + pack.pack_type.slice(1)}
                </div>
                <div className="text-gray-300 text-sm">Pack</div>
              </div>
              
              <Button 
                onClick={handleOpenPack}
                className="bg-theme-accent hover:bg-theme-accent-dark text-white px-8 py-3 text-lg"
              >
                <Sparkles className="mr-2" size={20} />
                Open Pack
              </Button>
            </>
          )}

          {isOpening && revealedCards.length === 0 && (
            <>
              {/* Opening Animation */}
              <div className="relative">
                <div className={`w-48 h-64 bg-gradient-to-br ${getPackTypeColor(pack.pack_type)} rounded-lg flex items-center justify-center animate-pulse`}>
                  <Sparkles size={64} className="text-white animate-spin" />
                </div>
                <div className="absolute inset-0 bg-white bg-opacity-20 rounded-lg animate-ping" />
              </div>
              <div className="text-white text-xl">Opening pack...</div>
            </>
          )}

          {revealedCards.length > 0 && !showAllCards && (
            <>
              {/* Card Reveal Animation */}
              <div className="text-white text-xl mb-4">
                Card {currentCardIndex} of {revealedCards.length}
              </div>
              <div className="w-80">
                {revealedCards.slice(0, currentCardIndex).map((card, index) => (
                  <div 
                    key={card.id} 
                    className={`${index === currentCardIndex - 1 ? 'animate-bounce' : ''}`}
                  >
                    <PlayerCard card={card} />
                  </div>
                ))}
              </div>
            </>
          )}

          {showAllCards && (
            <>
              {/* All Cards Revealed */}
              <div className="text-white text-xl mb-4">
                Pack opened! You received {revealedCards.length} cards:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
                {revealedCards.map((card) => (
                  <PlayerCard key={card.id} card={card} />
                ))}
              </div>
              <Button 
                onClick={handleFinish}
                className="bg-theme-accent hover:bg-theme-accent-dark text-white px-8 py-3"
              >
                Add to Collection
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
