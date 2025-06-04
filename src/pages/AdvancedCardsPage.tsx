
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Package, CreditCard, Evolution, Zap, Users, Gift, StarIcon } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { CardCollection } from '@/components/cards/CardCollection';
import { PackStore } from '@/components/cards/PackStore';
import { CardEvolution } from '@/components/cards/CardEvolution';
import { TradingInterface } from '@/components/cards/TradingInterface';
import { CardShowcase } from '@/components/cards/CardShowcase';
import { AdvancedPackStore } from '@/components/cards/AdvancedPackStore';
import { PlayerCard as PlayerCardType } from '@/types/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Define a new icon component for Evolution since it doesn't exist in lucide-react
const Evolution = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M4 6h16M4 18h10M4 12h6M17 12l-3-3m0 6l3-3" />
  </svg>
);

const AdvancedCardsPage: React.FC = () => {
  const { data: cards = [] } = useQuery({
    queryKey: ['user-cards'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return getDemoCards(); // Return demo cards for unauthenticated users

      // Get user's wallet addresses
      const { data: wallets } = await supabase
        .from('user_wallets')
        .select('wallet_address')
        .eq('user_id', user.id);

      if (!wallets || wallets.length === 0) return getDemoCards();

      const walletAddresses = wallets.map(w => w.wallet_address);

      // Get cards owned by user's wallets
      const { data: cards, error } = await supabase
        .from('nft_cards')
        .select('*')
        .in('owner_wallet', walletAddresses)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cards:', error);
        return getDemoCards();
      }

      return cards as PlayerCardType[];
    },
  });

  const getDemoCards = (): PlayerCardType[] => {
    // Generate some demo cards for development/preview
    const demoCards = [
      createDemoCard('NiKo', 'G2 Esports', 'legendary', 'Rifler'),
      createDemoCard('s1mple', 'NAVI', 'legendary', 'AWPer'),
      createDemoCard('ZywOo', 'Vitality', 'epic', 'AWPer'),
      createDemoCard('device', 'Astralis', 'epic', 'AWPer'),
      createDemoCard('electronic', 'NAVI', 'rare', 'Rifler'),
      createDemoCard('blameF', 'Astralis', 'rare', 'Entry Fragger'),
      createDemoCard('sh1ro', 'Cloud9', 'rare', 'AWPer'),
      createDemoCard('huNter', 'G2 Esports', 'common', 'Rifler'),
      createDemoCard('Twistzz', 'FaZe', 'common', 'Rifler'),
      createDemoCard('ropz', 'FaZe', 'common', 'Lurker'),
      createDemoCard('NiKo', 'G2 Esports', 'common', 'Rifler'),
      createDemoCard('s1mple', 'NAVI', 'common', 'AWPer')
    ];
    return demoCards;
  };

  const createDemoCard = (playerName: string, teamName: string, rarity: string, position: string): PlayerCardType => {
    const rarityLevel = { 'legendary': 4, 'epic': 3, 'rare': 2, 'common': 1 }[rarity] || 1;
    return {
      id: `demo-${playerName}-${rarity}-${Date.now() + Math.random()}`,
      card_id: `demo-card-${Date.now() + Math.random()}`,
      player_id: `demo-player-${playerName.toLowerCase()}`,
      player_name: playerName,
      player_type: 'professional',
      position: position,
      team_name: teamName,
      game: 'cs2',
      rarity: rarity as any,
      stats: {
        kills: 100 + Math.floor(Math.random() * 900),
        deaths: 50 + Math.floor(Math.random() * 450),
        assists: 25 + Math.floor(Math.random() * 175),
        adr: 50 + Math.floor(Math.random() * 50),
        kd_ratio: +(1 + Math.random()).toFixed(2),
        headshots: 50 + Math.floor(Math.random() * 250)
      },
      metadata: {
        performance_grade: ['S', 'A', 'B', 'C'][Math.floor(Math.random() * 4)]
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  const handleEvolvedCard = (evolvedCard: PlayerCardType) => {
    // In a real implementation, this would update the database
    console.log('Card evolved:', evolvedCard);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft size={16} className="mr-2" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-3xl font-bold font-gaming">
              <span className="highlight-gradient">Advanced</span> Cards System
            </h1>
          </div>

          <Tabs defaultValue="collection" className="space-y-6">
            <TabsList className="grid w-full sm:grid-cols-3 md:grid-cols-6 bg-theme-gray-dark">
              <TabsTrigger 
                value="collection" 
                className="data-[state=active]:bg-theme-accent data-[state=active]:text-white"
              >
                <CreditCard className="mr-2" size={16} />
                Collection
              </TabsTrigger>
              <TabsTrigger 
                value="evolution" 
                className="data-[state=active]:bg-theme-accent data-[state=active]:text-white"
              >
                <Evolution />
                <span className="ml-2">Evolution</span>
              </TabsTrigger>
              <TabsTrigger 
                value="trading" 
                className="data-[state=active]:bg-theme-accent data-[state=active]:text-white"
              >
                <Users className="mr-2" size={16} />
                Trading
              </TabsTrigger>
              <TabsTrigger 
                value="showcase" 
                className="data-[state=active]:bg-theme-accent data-[state=active]:text-white"
              >
                <StarIcon className="mr-2" size={16} />
                Showcase
              </TabsTrigger>
              <TabsTrigger 
                value="packs" 
                className="data-[state=active]:bg-theme-accent data-[state=active]:text-white"
              >
                <Package className="mr-2" size={16} />
                Basic Packs
              </TabsTrigger>
              <TabsTrigger 
                value="advanced-packs" 
                className="data-[state=active]:bg-theme-accent data-[state=active]:text-white"
              >
                <Gift className="mr-2" size={16} />
                Advanced Packs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="collection" className="space-y-6">
              <CardCollection />
            </TabsContent>

            <TabsContent value="evolution" className="space-y-6">
              <CardEvolution cards={cards} onEvolution={handleEvolvedCard} />
            </TabsContent>

            <TabsContent value="trading" className="space-y-6">
              <TradingInterface userCards={cards} onTradeComplete={() => {}} />
            </TabsContent>

            <TabsContent value="showcase" className="space-y-6">
              <CardShowcase cards={cards} />
            </TabsContent>

            <TabsContent value="packs" className="space-y-6">
              <PackStore />
            </TabsContent>

            <TabsContent value="advanced-packs" className="space-y-6">
              <AdvancedPackStore />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdvancedCardsPage;
