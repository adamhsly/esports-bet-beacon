
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, ShoppingCart, Tag, ArrowUpDown, DollarSign } from 'lucide-react';
import { MarketplaceListing } from '@/types/marketplace';
import { PlayerCard } from '@/types/card';

type ListingWithCard = MarketplaceListing & { card: PlayerCard };

export const CardMarketplace: React.FC = () => {
  const [listings, setListings] = useState<ListingWithCard[]>([]);
  const [myListings, setMyListings] = useState<ListingWithCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [priceSort, setPriceSort] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // For now, use demo data since the tables are new
      // In a real implementation, this would fetch from card_marketplace
      const demoListings: ListingWithCard[] = [
        {
          id: 'demo-1',
          seller_user_id: 'demo-seller-1',
          card_id: 'demo-card-1',
          listing_type: 'sale',
          price: 150,
          listing_status: 'active',
          description: 'Rare AWPer card from recent tournament performance',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          card: {
            id: 'demo-card-1',
            card_id: 'demo-card-1',
            player_id: 'demo-player-1',
            player_name: 'dev1ce',
            player_type: 'professional',
            rarity: 'legendary',
            position: 'AWPer',
            team_name: 'Astralis',
            game: 'cs2',
            stats: {
              kills: 25,
              deaths: 12,
              assists: 8,
              adr: 85.5,
              kd_ratio: 2.08,
              rating: 1.45
            },
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        {
          id: 'demo-2',
          seller_user_id: 'demo-seller-2',
          card_id: 'demo-card-2',
          listing_type: 'trade',
          listing_status: 'active',
          description: 'Looking to trade for a good entry fragger',
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          card: {
            id: 'demo-card-2',
            card_id: 'demo-card-2',
            player_id: 'demo-player-2',
            player_name: 's1mple',
            player_type: 'professional',
            rarity: 'epic',
            position: 'Rifler',
            team_name: 'NAVI',
            game: 'cs2',
            stats: {
              kills: 28,
              deaths: 15,
              assists: 6,
              adr: 92.3,
              kd_ratio: 1.87,
              rating: 1.52
            },
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      ];

      // Filter by user for demo
      const publicListings = user ? demoListings : demoListings;
      const userListings: ListingWithCard[] = [];

      setListings(publicListings);
      setMyListings(userListings);

    } catch (error) {
      console.error('Error fetching listings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch marketplace listings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const buyCard = async (listingId: string, price: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to purchase cards",
          variant: "destructive",
        });
        return;
      }

      // In a real implementation, this would update the marketplace
      toast({
        title: "Purchase Successful!",
        description: `Card purchased for $${price}`,
      });

      fetchListings();
    } catch (error) {
      console.error('Error purchasing card:', error);
      toast({
        title: "Error",
        description: "Failed to purchase card",
        variant: "destructive",
      });
    }
  };

  const cancelListing = async (listingId: string) => {
    try {
      // In a real implementation, this would update the marketplace
      toast({
        title: "Listing Cancelled",
        description: "Your listing has been cancelled",
      });

      fetchListings();
    } catch (error) {
      console.error('Error cancelling listing:', error);
      toast({
        title: "Error",
        description: "Failed to cancel listing",
        variant: "destructive",
      });
    }
  };

  const filteredListings = listings
    .filter(listing => {
      const matchesSearch = listing.card.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           listing.card.team_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRarity = rarityFilter === 'all' || listing.card.rarity === rarityFilter;
      return matchesSearch && matchesRarity;
    })
    .sort((a, b) => {
      if (!a.price || !b.price) return 0;
      return priceSort === 'asc' ? a.price - b.price : b.price - a.price;
    });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-500';
      case 'epic': return 'bg-purple-500';
      case 'rare': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const ListingCard: React.FC<{ listing: ListingWithCard; showActions?: boolean }> = ({ 
    listing, 
    showActions = false 
  }) => (
    <Card className="hover:bg-theme-gray-dark/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{listing.card.player_name}</CardTitle>
          <Badge className={getRarityColor(listing.card.rarity)}>
            {listing.card.rarity}
          </Badge>
        </div>
        <p className="text-sm text-gray-400">{listing.card.team_name} • {listing.card.position}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-semibold">{listing.card.stats.kills || 0}</div>
              <div className="text-gray-500">Kills</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{listing.card.stats.adr || 0}</div>
              <div className="text-gray-500">ADR</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{listing.card.stats.kd_ratio || 0}</div>
              <div className="text-gray-500">K/D</div>
            </div>
          </div>

          {listing.listing_type === 'sale' && listing.price && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-lg font-bold">${listing.price}</span>
              </div>
              {showActions ? (
                <Button size="sm" onClick={() => buyCard(listing.id, listing.price)}>
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Buy
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => cancelListing(listing.id)}>
                  Cancel
                </Button>
              )}
            </div>
          )}

          {listing.listing_type === 'trade' && (
            <div className="text-center">
              <Badge variant="outline">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                Trade Only
              </Badge>
            </div>
          )}

          {listing.description && (
            <p className="text-xs text-gray-400 line-clamp-2">{listing.description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

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
      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">Browse Marketplace</TabsTrigger>
          <TabsTrigger value="my-listings">My Listings</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search players, teams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={rarityFilter} onValueChange={setRarityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by rarity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rarities</SelectItem>
                    <SelectItem value="common">Common</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                    <SelectItem value="legendary">Legendary</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priceSort} onValueChange={(value: 'asc' | 'desc') => setPriceSort(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Price: Low to High</SelectItem>
                    <SelectItem value="desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Listings Grid */}
          {filteredListings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">No Cards Found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map(listing => (
                <ListingCard key={listing.id} listing={listing} showActions />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-listings" className="space-y-4">
          {myListings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">No Active Listings</h3>
                <p className="text-gray-500">List some cards to start selling or trading!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myListings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
