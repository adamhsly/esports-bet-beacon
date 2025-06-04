
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayerCard } from './PlayerCard';
import { PlayerCard as PlayerCardType } from '@/types/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeftRight, Users, Clock, CheckCircle, XCircle, Search } from 'lucide-react';

interface TradeOffer {
  id: string;
  fromUser: string;
  toUser: string;
  offeredCards: PlayerCardType[];
  requestedCards: PlayerCardType[];
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message?: string;
  createdAt: string;
  expiresAt: string;
}

interface TradingInterfaceProps {
  userCards: PlayerCardType[];
  onTradeComplete: (trade: TradeOffer) => void;
}

export const TradingInterface: React.FC<TradingInterfaceProps> = ({ userCards, onTradeComplete }) => {
  const [activeTab, setActiveTab] = useState('create');
  const [selectedOffer, setSelectedOffer] = useState<PlayerCardType[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PlayerCardType[]>([]);
  const [tradePartner, setTradePartner] = useState('');
  const [tradeMessage, setTradeMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Mock trade offers for demo
  const [tradeOffers] = useState<TradeOffer[]>([
    {
      id: 'trade-1',
      fromUser: 'ProTrader123',
      toUser: 'CurrentUser',
      offeredCards: [
        {
          id: 'offer-card-1',
          card_id: 'offer-card-1',
          player_id: 'niko',
          player_name: 'NiKo',
          player_type: 'professional',
          position: 'Rifler',
          team_name: 'G2 Esports',
          game: 'cs2',
          rarity: 'legendary',
          stats: { kills: 1250, deaths: 980, assists: 450, adr: 85.2, kd_ratio: 1.28 },
          metadata: { performance_grade: 'S' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      requestedCards: [],
      status: 'pending',
      message: 'Great card! Would love to trade for this.',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString()
    }
  ]);

  const filteredCards = userCards.filter(card =>
    card.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (card.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const handleCardSelect = (card: PlayerCardType, type: 'offer' | 'request') => {
    if (type === 'offer') {
      if (selectedOffer.includes(card)) {
        setSelectedOffer(prev => prev.filter(c => c.id !== card.id));
      } else {
        setSelectedOffer(prev => [...prev, card]);
      }
    } else {
      if (selectedRequest.includes(card)) {
        setSelectedRequest(prev => prev.filter(c => c.id !== card.id));
      } else {
        setSelectedRequest(prev => [...prev, card]);
      }
    }
  };

  const createTradeOffer = () => {
    if (selectedOffer.length === 0 || !tradePartner) {
      toast({
        title: "Incomplete Trade",
        description: "Please select cards to offer and specify a trade partner",
        variant: "destructive"
      });
      return;
    }

    const newTrade: TradeOffer = {
      id: `trade-${Date.now()}`,
      fromUser: 'CurrentUser',
      toUser: tradePartner,
      offeredCards: selectedOffer,
      requestedCards: selectedRequest,
      status: 'pending',
      message: tradeMessage,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    toast({
      title: "Trade Offer Sent!",
      description: `Trade offer sent to ${tradePartner}`,
    });

    // Reset form
    setSelectedOffer([]);
    setSelectedRequest([]);
    setTradePartner('');
    setTradeMessage('');
  };

  const respondToTrade = (tradeId: string, response: 'accept' | 'decline') => {
    const trade = tradeOffers.find(t => t.id === tradeId);
    if (!trade) return;

    if (response === 'accept') {
      onTradeComplete({ ...trade, status: 'accepted' });
      toast({
        title: "Trade Accepted!",
        description: "Cards have been exchanged successfully",
      });
    } else {
      toast({
        title: "Trade Declined",
        description: "Trade offer has been declined",
      });
    }
  };

  const calculateTradeValue = (cards: PlayerCardType[]) => {
    return cards.reduce((total, card) => {
      const rarityMultiplier = {
        'common': 1,
        'rare': 3,
        'epic': 8,
        'legendary': 20
      };
      return total + (rarityMultiplier[card.rarity] * 100);
    }, 0);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'accepted': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'declined': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Trade</TabsTrigger>
          <TabsTrigger value="incoming">
            Incoming ({tradeOffers.filter(t => t.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5" />
                Create Trade Offer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Trade partner username"
                  value={tradePartner}
                  onChange={(e) => setTradePartner(e.target.value)}
                />
                <Input
                  placeholder="Optional message"
                  value={tradeMessage}
                  onChange={(e) => setTradeMessage(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Your Offer */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Your Offer ({selectedOffer.length} cards)</h3>
                  <div className="bg-theme-gray-dark p-4 rounded-lg min-h-32">
                    {selectedOffer.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">Select cards to offer</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedOffer.map(card => (
                          <div key={card.id} className="relative">
                            <PlayerCard card={card} className="scale-75" />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute -top-1 -right-1 h-6 w-6 p-0"
                              onClick={() => handleCardSelect(card, 'offer')}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline">
                    Total Value: {calculateTradeValue(selectedOffer)} credits
                  </Badge>
                </div>

                {/* Your Request */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Your Request ({selectedRequest.length} cards)</h3>
                  <div className="bg-theme-gray-dark p-4 rounded-lg min-h-32">
                    {selectedRequest.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">Optional: Specify desired cards</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedRequest.map(card => (
                          <div key={card.id} className="relative">
                            <PlayerCard card={card} className="scale-75" />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute -top-1 -right-1 h-6 w-6 p-0"
                              onClick={() => handleCardSelect(card, 'request')}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline">
                    Total Value: {calculateTradeValue(selectedRequest)} credits
                  </Badge>
                </div>
              </div>

              <Button onClick={createTradeOffer} className="w-full">
                Send Trade Offer
              </Button>
            </CardContent>
          </Card>

          {/* Card Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Your Cards</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search your cards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredCards.map(card => (
                  <div key={card.id} className="relative">
                    <PlayerCard
                      card={card}
                      onClick={() => handleCardSelect(card, 'offer')}
                      className={`cursor-pointer transition-all ${
                        selectedOffer.includes(card) ? 'ring-2 ring-blue-400' : 'hover:ring-1 ring-gray-400'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incoming" className="space-y-4">
          {tradeOffers.filter(t => t.status === 'pending').map(trade => (
            <Card key={trade.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Trade from {trade.fromUser}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(trade.status)}
                    <Badge>{trade.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {trade.message && (
                  <div className="bg-theme-gray-dark p-3 rounded-lg">
                    <p className="text-sm">"{trade.message}"</p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">They Offer</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {trade.offeredCards.map(card => (
                        <PlayerCard key={card.id} card={card} className="scale-75" />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">They Want</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {trade.requestedCards.length > 0 ? (
                        trade.requestedCards.map(card => (
                          <PlayerCard key={card.id} card={card} className="scale-75" />
                        ))
                      ) : (
                        <p className="text-gray-400 text-center py-8 col-span-2">
                          Open to any fair trade
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {trade.status === 'pending' && (
                  <div className="flex gap-4 pt-4">
                    <Button
                      onClick={() => respondToTrade(trade.id, 'accept')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Accept Trade
                    </Button>
                    <Button
                      onClick={() => respondToTrade(trade.id, 'decline')}
                      variant="destructive"
                      className="flex-1"
                    >
                      Decline Trade
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {tradeOffers.filter(t => t.status === 'pending').length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">No Pending Trades</h3>
                <p className="text-gray-500">When someone sends you a trade offer, it will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2">Trade History</h3>
              <p className="text-gray-500">Your completed trades will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
