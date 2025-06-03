
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PackOpeningModal } from './PackOpeningModal';
import { Pack, PlayerCard as PlayerCardType } from '@/types/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Gift, Star, Crown, Zap } from 'lucide-react';

const packTypes = [
  {
    type: 'starter',
    name: 'Starter Pack',
    price: 500,
    description: '3 cards guaranteed, 1 rare or higher',
    icon: Gift,
    color: 'from-gray-600 to-gray-800',
    cardCount: 3,
    guarantees: ['1 Rare+ card']
  },
  {
    type: 'premium',
    name: 'Premium Pack',
    price: 1200,
    description: '5 cards guaranteed, 1 epic or higher',
    icon: Star,
    color: 'from-blue-600 to-blue-800',
    cardCount: 5,
    guarantees: ['1 Epic+ card', '2 Rare+ cards']
  },
  {
    type: 'legendary',
    name: 'Legendary Pack',
    price: 2500,
    description: '7 cards guaranteed, 1 legendary guaranteed',
    icon: Crown,
    color: 'from-yellow-600 to-yellow-800',
    cardCount: 7,
    guarantees: ['1 Legendary card', '2 Epic+ cards']
  },
  {
    type: 'special',
    name: 'Special Edition',
    price: 5000,
    description: '10 cards guaranteed, exclusive special cards',
    icon: Zap,
    color: 'from-purple-600 to-purple-800',
    cardCount: 10,
    guarantees: ['Exclusive cards', '3 Legendary+ cards']
  }
];

export const PackStore: React.FC = () => {
  const [openingPack, setOpeningPack] = useState<Pack | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate mock cards for pack opening (in real implementation, this would be server-side)
  const generateMockCards = (packType: string, count: number): PlayerCardType[] => {
    const mockPlayers = [
      { name: 'NiKo', team: 'G2 Esports', position: 'Rifler' },
      { name: 's1mple', team: 'NAVI', position: 'AWPer' },
      { name: 'ZywOo', team: 'Vitality', position: 'AWPer' },
      { name: 'sh1ro', team: 'Cloud9', position: 'AWPer' },
      { name: 'device', team: 'Astralis', position: 'AWPer' },
      { name: 'electronic', team: 'NAVI', position: 'Rifler' },
    ];

    const cards: PlayerCardType[] = [];
    
    for (let i = 0; i < count; i++) {
      const player = mockPlayers[Math.floor(Math.random() * mockPlayers.length)];
      let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';
      
      // Determine rarity based on pack type and guarantees
      if (i === 0) {
        switch (packType) {
          case 'starter': rarity = Math.random() > 0.5 ? 'rare' : 'epic'; break;
          case 'premium': rarity = Math.random() > 0.5 ? 'epic' : 'legendary'; break;
          case 'legendary': rarity = 'legendary'; break;
          case 'special': rarity = 'legendary'; break;
        }
      } else {
        const rand = Math.random();
        if (rand > 0.9) rarity = 'legendary';
        else if (rand > 0.7) rarity = 'epic';
        else if (rand > 0.4) rarity = 'rare';
        else rarity = 'common';
      }

      cards.push({
        id: `mock-${Date.now()}-${i}`,
        card_id: `card-${Date.now()}-${i}`,
        player_id: `player-${player.name.toLowerCase()}`,
        player_name: player.name,
        player_type: 'professional',
        position: player.position,
        team_name: player.team,
        game: 'cs2',
        rarity,
        stats: {
          kills: Math.floor(Math.random() * 1000) + 100,
          deaths: Math.floor(Math.random() * 800) + 50,
          assists: Math.floor(Math.random() * 500) + 20,
          adr: Math.floor(Math.random() * 50) + 50,
          kd_ratio: +(Math.random() * 2 + 0.5).toFixed(2),
          headshots: Math.floor(Math.random() * 300) + 10,
        },
        metadata: {
          performance_grade: ['S', 'A', 'B', 'C'][Math.floor(Math.random() * 4)],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return cards;
  };

  const purchasePack = useMutation({
    mutationFn: async (packType: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const pack = packTypes.find(p => p.type === packType);
      if (!pack) throw new Error('Invalid pack type');

      // Generate cards for the pack
      const cards = generateMockCards(packType, pack.cardCount);

      // Create pack purchase record
      const { data, error } = await supabase
        .from('pack_purchases')
        .insert({
          user_id: user.id,
          pack_type: packType,
          pack_price: pack.price,
          payment_method: 'credits',
          cards_received: cards,
          is_opened: false,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        cards_received: cards,
      } as Pack;
    },
    onSuccess: (pack) => {
      setOpeningPack(pack);
      toast({
        title: "Pack Purchased!",
        description: `You bought a ${pack.pack_type} pack. Click to open it!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Failed to purchase pack",
        variant: "destructive"
      });
    },
  });

  const handlePackOpened = async (cards: PlayerCardType[]) => {
    // In a real implementation, this would save the cards to the user's collection
    console.log('Cards received:', cards);
    
    // Invalidate user cards query to refresh collection
    queryClient.invalidateQueries({ queryKey: ['user-cards'] });
    
    toast({
      title: "Cards Added!",
      description: `${cards.length} new cards have been added to your collection!`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Card Pack Store</h2>
        <p className="text-gray-400">Purchase packs to expand your collection with new player cards</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packTypes.map((pack) => {
          const IconComponent = pack.icon;
          return (
            <Card key={pack.type} className="bg-theme-gray-dark border-theme-gray hover:border-theme-accent transition-colors">
              <CardHeader className="text-center">
                <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${pack.color} rounded-lg flex items-center justify-center mb-4`}>
                  <IconComponent size={32} className="text-white" />
                </div>
                <CardTitle className="text-white">{pack.name}</CardTitle>
                <div className="text-2xl font-bold text-theme-accent">{pack.price} Credits</div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-gray-400 text-sm text-center">{pack.description}</p>
                
                <div className="space-y-2">
                  <div className="text-white font-semibold">Contains:</div>
                  <div className="text-sm text-gray-300">{pack.cardCount} cards</div>
                  
                  <div className="space-y-1">
                    {pack.guarantees.map((guarantee, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {guarantee}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button 
                  className="w-full bg-theme-accent hover:bg-theme-accent-dark"
                  onClick={() => purchasePack.mutate(pack.type)}
                  disabled={purchasePack.isPending}
                >
                  {purchasePack.isPending ? 'Purchasing...' : 'Purchase Pack'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pack Opening Modal */}
      {openingPack && (
        <PackOpeningModal
          pack={openingPack}
          isOpen={!!openingPack}
          onClose={() => setOpeningPack(null)}
          onPackOpened={handlePackOpened}
        />
      )}
    </div>
  );
};
