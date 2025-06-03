
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlayerCard } from './PlayerCard';
import { CardDetailsModal } from './CardDetailsModal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayerCard as PlayerCardType } from '@/types/card';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter } from 'lucide-react';

export const CardCollection: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<PlayerCardType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['user-cards'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's wallet addresses
      const { data: wallets } = await supabase
        .from('user_wallets')
        .select('wallet_address')
        .eq('user_id', user.id);

      if (!wallets || wallets.length === 0) return [];

      const walletAddresses = wallets.map(w => w.wallet_address);

      // Get cards owned by user's wallets
      const { data: cards, error } = await supabase
        .from('nft_cards')
        .select('*')
        .in('owner_wallet', walletAddresses)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cards:', error);
        return [];
      }

      return cards as PlayerCardType[];
    },
  });

  // Filter cards based on search and filters
  const filteredCards = cards.filter(card => {
    const matchesSearch = card.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (card.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesRarity = rarityFilter === 'all' || card.rarity === rarityFilter;
    const matchesTeam = teamFilter === 'all' || card.team_name === teamFilter;
    
    return matchesSearch && matchesRarity && matchesTeam;
  });

  // Get unique teams for filter
  const uniqueTeams = [...new Set(cards.map(card => card.team_name).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-64 bg-theme-gray-dark rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Search players or teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-theme-gray-dark border-theme-gray text-white"
          />
        </div>
        
        <Select value={rarityFilter} onValueChange={setRarityFilter}>
          <SelectTrigger className="w-40 bg-theme-gray-dark border-theme-gray text-white">
            <Filter size={16} className="mr-2" />
            <SelectValue placeholder="Rarity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rarities</SelectItem>
            <SelectItem value="common">Common</SelectItem>
            <SelectItem value="rare">Rare</SelectItem>
            <SelectItem value="epic">Epic</SelectItem>
            <SelectItem value="legendary">Legendary</SelectItem>
          </SelectContent>
        </Select>

        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-40 bg-theme-gray-dark border-theme-gray text-white">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {uniqueTeams.map(team => (
              <SelectItem key={team} value={team!}>{team}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Collection Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-theme-gray-dark p-4 rounded-lg">
          <div className="text-2xl font-bold text-white">{cards.length}</div>
          <div className="text-gray-400">Total Cards</div>
        </div>
        <div className="bg-theme-gray-dark p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-400">
            {cards.filter(c => c.rarity === 'legendary').length}
          </div>
          <div className="text-gray-400">Legendary</div>
        </div>
        <div className="bg-theme-gray-dark p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-400">
            {cards.filter(c => c.rarity === 'epic').length}
          </div>
          <div className="text-gray-400">Epic</div>
        </div>
        <div className="bg-theme-gray-dark p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-400">
            {cards.filter(c => c.rarity === 'rare').length}
          </div>
          <div className="text-gray-400">Rare</div>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredCards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCards.map((card) => (
            <PlayerCard
              key={card.id}
              card={card}
              onClick={() => setSelectedCard(card)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">
            {cards.length === 0 ? 'No cards in your collection yet' : 'No cards match your filters'}
          </div>
          <div className="text-gray-500 mt-2">
            {cards.length === 0 ? 'Purchase some packs to get started!' : 'Try adjusting your search or filters'}
          </div>
        </div>
      )}

      {/* Card Details Modal */}
      {selectedCard && (
        <CardDetailsModal
          card={selectedCard}
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
};
