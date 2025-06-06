
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCardMinting } from '@/hooks/useCardMinting';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { CardMintingStatus } from './CardMintingStatus';
import { PlayerCard } from '@/types/card';
import { Users, Coins } from 'lucide-react';

interface ExtendedPlayerCard extends PlayerCard {
  is_minted?: boolean;
  mint_status?: 'pending' | 'minting' | 'minted' | 'failed';
  mint_transaction_hash?: string;
  blockchain_status?: string;
}

export const CardCollection: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { mintCards, isProcessing, canMint } = useCardMinting();
  const { isConnected } = useWalletConnection();
  const [cards, setCards] = useState<ExtendedPlayerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  const fetchUserCards = async () => {
    if (!user) return;

    try {
      const { data: collection, error } = await supabase
        .from('user_card_collections')
        .select(`
          *,
          nft_cards (
            id,
            player_name,
            team_name,
            position,
            rarity,
            stats,
            metadata,
            game,
            blockchain_status,
            mint_transaction_hash,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching cards:', error);
        toast({
          title: "Error",
          description: "Failed to load your card collection",
          variant: "destructive",
        });
        return;
      }

      const userCards: ExtendedPlayerCard[] = collection?.map(item => {
        const card = item.nft_cards;
        if (!card) return null;

        return {
          ...card,
          card_id: card.id,
          player_id: `${card.player_name}_${card.team_name}`,
          player_type: 'Professional',
          owner_wallet: null,
          token_id: null,
          is_minted: item.is_minted,
          mint_status: item.mint_status,
          mint_transaction_hash: item.mint_transaction_hash,
          blockchain_status: card.blockchain_status
        };
      }).filter(Boolean) as ExtendedPlayerCard[];

      setCards(userCards);
    } catch (error) {
      console.error('Error in fetchUserCards:', error);
      toast({
        title: "Error",
        description: "Failed to load your cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCards();
  }, [user]);

  const handleCardSelection = (cardId: string, checked: boolean) => {
    setSelectedCards(prev => 
      checked 
        ? [...prev, cardId]
        : prev.filter(id => id !== cardId)
    );
  };

  const handleBatchMint = async () => {
    if (selectedCards.length === 0) {
      toast({
        title: "No Cards Selected",
        description: "Please select cards to mint",
        variant: "destructive",
      });
      return;
    }

    const success = await mintCards(selectedCards);
    if (success) {
      setSelectedCards([]);
      // Refresh the cards to show updated status
      setTimeout(() => {
        fetchUserCards();
      }, 1000);
    }
  };

  const handleSingleCardMint = async (cardId: string) => {
    const success = await mintCards([cardId]);
    if (success) {
      // Refresh the cards to show updated status
      setTimeout(() => {
        fetchUserCards();
      }, 1000);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary': return 'border-yellow-500 bg-yellow-500/10';
      case 'epic': return 'border-purple-500 bg-purple-500/10';
      case 'rare': return 'border-blue-500 bg-blue-500/10';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const unmintedCards = cards.filter(card => !card.is_minted);
  const mintedCards = cards.filter(card => card.is_minted);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-purple"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Card Collection
            <Badge variant="outline" className="ml-auto">
              {cards.length} cards
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Batch minting controls */}
          {isConnected && unmintedCards.length > 0 && (
            <div className="mb-6 p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium">Mint Cards as NFTs</h3>
                  <p className="text-sm text-gray-600">
                    Select cards to mint as NFTs on the blockchain
                  </p>
                </div>
                <Button
                  onClick={handleBatchMint}
                  disabled={selectedCards.length === 0 || isProcessing}
                  className="flex items-center gap-2"
                >
                  <Coins className="h-4 w-4" />
                  Mint Selected ({selectedCards.length})
                </Button>
              </div>
            </div>
          )}

          {cards.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No cards in your collection yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Start by claiming your welcome pack or purchasing card packs
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className={`p-4 border-2 rounded-lg ${getRarityColor(card.rarity)}`}
                >
                  {/* Selection checkbox for unminted cards */}
                  {isConnected && !card.is_minted && (
                    <div className="flex items-center space-x-2 mb-3">
                      <Checkbox
                        id={`card-${card.id}`}
                        checked={selectedCards.includes(card.id)}
                        onCheckedChange={(checked) => 
                          handleCardSelection(card.id, checked as boolean)
                        }
                      />
                      <label 
                        htmlFor={`card-${card.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Select for minting
                      </label>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <div className="font-semibold text-lg">{card.player_name}</div>
                      <div className="text-sm text-gray-600">
                        {card.team_name} • {card.position}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{card.rarity}</Badge>
                      <Badge variant="secondary">{card.game.toUpperCase()}</Badge>
                    </div>

                    {card.stats && (
                      <div className="text-xs text-gray-500">
                        KD: {card.stats.kd_ratio || 'N/A'} | 
                        ADR: {card.stats.adr || 'N/A'}
                      </div>
                    )}

                    <CardMintingStatus
                      isNFT={card.blockchain_status !== 'database'}
                      isMinted={card.is_minted || false}
                      mintStatus={card.mint_status || 'pending'}
                      transactionHash={card.mint_transaction_hash}
                      onMint={() => handleSingleCardMint(card.id)}
                      canMint={canMint}
                      showMintButton={!selectedCards.length}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
