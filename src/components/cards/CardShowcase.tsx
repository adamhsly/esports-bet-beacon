import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayerCard } from './PlayerCard';
import { PlayerCard as PlayerCardType } from '@/types/card';
import { Image, Star, Trophy, Share2, Heart, Eye } from 'lucide-react';

interface CardShowcaseProps {
  cards: PlayerCardType[];
}

interface ShowcaseLayout {
  id: string;
  name: string;
  columns: number;
  maxCards: number;
}

const showcaseLayouts: ShowcaseLayout[] = [
  { id: 'grid', name: 'Grid Layout', columns: 4, maxCards: 12 },
  { id: 'spotlight', name: 'Spotlight', columns: 1, maxCards: 1 },
  { id: 'team', name: 'Team Formation', columns: 5, maxCards: 5 },
  { id: 'collection', name: 'Collection Wall', columns: 6, maxCards: 18 }
];

export const CardShowcase: React.FC<CardShowcaseProps> = ({ cards }) => {
  const [selectedLayout, setSelectedLayout] = useState<ShowcaseLayout>(showcaseLayouts[0]);
  const [showcaseCards, setShowcaseCards] = useState<PlayerCardType[]>([]);
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rarity');

  const filteredCards = cards
    .filter(card => filterRarity === 'all' || card.rarity === filterRarity)
    .sort((a, b) => {
      switch (sortBy) {
        case 'rarity':
          const rarityOrder = { 'legendary': 4, 'epic': 3, 'rare': 2, 'common': 1 };
          return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        case 'performance':
          return (b.stats.kd_ratio || 0) - (a.stats.kd_ratio || 0);
        case 'name':
          return a.player_name.localeCompare(b.player_name);
        default:
          return 0;
      }
    });

  const addToShowcase = (card: PlayerCardType) => {
    if (showcaseCards.length < selectedLayout.maxCards && !showcaseCards.find(c => c.id === card.id)) {
      setShowcaseCards(prev => [...prev, card]);
    }
  };

  const removeFromShowcase = (cardId: string) => {
    setShowcaseCards(prev => prev.filter(c => c.id !== cardId));
  };

  const autoFillShowcase = () => {
    const topCards = filteredCards.slice(0, selectedLayout.maxCards);
    setShowcaseCards(topCards);
  };

  const shareShowcase = () => {
    // In a real app, this would generate a shareable link
    const showcaseData = {
      layout: selectedLayout.id,
      cards: showcaseCards.map(c => ({ 
        player: c.player_name, 
        rarity: c.rarity,
        team: c.team_name 
      }))
    };
    
    navigator.clipboard.writeText(JSON.stringify(showcaseData));
    // Toast notification would go here
  };

  const getLayoutStyle = () => {
    switch (selectedLayout.id) {
      case 'spotlight':
        return 'flex justify-center items-center min-h-64';
      case 'team':
        return 'grid grid-cols-5 gap-4 justify-items-center';
      case 'collection':
        return 'grid grid-cols-6 gap-2';
      default:
        return 'grid grid-cols-4 gap-4';
    }
  };

  const achievements = [
    { id: 'collector', name: 'Card Collector', description: 'Own 50+ cards', progress: Math.min(cards.length, 50), max: 50 },
    { id: 'legendary', name: 'Legendary Hunter', description: 'Own 5 legendary cards', progress: cards.filter(c => c.rarity === 'legendary').length, max: 5 },
    { id: 'teams', name: 'Team Diversity', description: 'Collect cards from 10 teams', progress: new Set(cards.map(c => c.team_name)).size, max: 10 }
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="showcase">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="showcase">
            <Image className="mr-2" size={16} />
            Showcase
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Trophy className="mr-2" size={16} />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="stats">
            <Star className="mr-2" size={16} />
            Collection Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="showcase" className="space-y-6">
          {/* Showcase Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Card Showcase</span>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm text-gray-400">127 views</span>
                  <Heart className="h-4 w-4" />
                  <span className="text-sm text-gray-400">23 likes</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select value={selectedLayout.id} onValueChange={(value) => 
                  setSelectedLayout(showcaseLayouts.find(l => l.id === value) || showcaseLayouts[0])
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Layout" />
                  </SelectTrigger>
                  <SelectContent>
                    {showcaseLayouts.map(layout => (
                      <SelectItem key={layout.id} value={layout.id}>
                        {layout.name} ({layout.maxCards} cards)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterRarity} onValueChange={setFilterRarity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by rarity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rarities</SelectItem>
                    <SelectItem value="legendary">Legendary</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="common">Common</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={autoFillShowcase} variant="outline">
                  Auto Fill
                </Button>

                <Button onClick={shareShowcase} className="bg-theme-accent">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {showcaseCards.length}/{selectedLayout.maxCards} cards
                </Badge>
                <Badge variant="outline">
                  Layout: {selectedLayout.name}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Showcase Display */}
          <Card>
            <CardContent className="p-8">
              <div className={getLayoutStyle()}>
                {showcaseCards.map((card, index) => (
                  <div key={card.id} className="relative group">
                    <PlayerCard 
                      card={card} 
                      className={selectedLayout.id === 'collection' ? 'scale-75' : ''}
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFromShowcase(card.id)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: selectedLayout.maxCards - showcaseCards.length }).map((_, index) => (
                  <div 
                    key={`empty-${index}`} 
                    className="border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center h-64 bg-theme-gray-dark/50"
                  >
                    <span className="text-gray-500">Empty Slot</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Card Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Add Cards to Showcase</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredCards.slice(0, 20).map(card => (
                  <div key={card.id} className="relative">
                    <PlayerCard 
                      card={card} 
                      onClick={() => addToShowcase(card)}
                      className={`cursor-pointer transition-all scale-90 ${
                        showcaseCards.find(c => c.id === card.id) 
                          ? 'opacity-50' 
                          : 'hover:scale-95 hover:ring-1 ring-theme-accent'
                      }`}
                    />
                    {showcaseCards.find(c => c.id === card.id) && (
                      <Badge className="absolute top-2 left-2 bg-green-600">
                        Added
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          {achievements.map(achievement => (
            <Card key={achievement.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{achievement.name}</h3>
                    <p className="text-sm text-gray-400">{achievement.description}</p>
                  </div>
                  <Badge variant={achievement.progress >= achievement.max ? 'default' : 'outline'}>
                    {achievement.progress}/{achievement.max}
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-theme-accent h-2 rounded-full transition-all" 
                    style={{ width: `${(achievement.progress / achievement.max) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{cards.length}</div>
                <div className="text-sm text-gray-400">Total Cards</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {cards.filter(c => c.rarity === 'legendary').length}
                </div>
                <div className="text-sm text-gray-400">Legendary</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {new Set(cards.map(c => c.team_name)).size}
                </div>
                <div className="text-sm text-gray-400">Teams</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {Math.round(cards.reduce((sum, c) => sum + (c.stats.kd_ratio || 0), 0) / cards.length * 100) / 100}
                </div>
                <div className="text-sm text-gray-400">Avg K/D</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
