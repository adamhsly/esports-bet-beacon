
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Gift, Calendar, Star, Zap, Crown, Settings, Bell } from 'lucide-react';

interface PackSubscription {
  id: string;
  name: string;
  description: string;
  price: number;
  frequency: 'weekly' | 'monthly';
  guaranteed: string[];
  icon: any;
}

interface ThemedPack {
  id: string;
  name: string;
  theme: string;
  description: string;
  price: number;
  limited: boolean;
  expiresAt?: string;
  cards: number;
  guaranteed: string[];
  icon: any;
}

export const AdvancedPackStore: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const packSubscriptions: PackSubscription[] = [
    {
      id: 'weekly-starter',
      name: 'Weekly Starter',
      description: 'Regular pack delivery every week',
      price: 400,
      frequency: 'weekly',
      guaranteed: ['1 Rare+ card'],
      icon: Gift
    },
    {
      id: 'monthly-premium',
      name: 'Monthly Premium',
      description: 'Premium pack delivered monthly',
      price: 1500,
      frequency: 'monthly',
      guaranteed: ['1 Epic+ card', '3 Rare+ cards'],
      icon: Star
    },
    {
      id: 'monthly-elite',
      name: 'Monthly Elite',
      description: 'Elite pack with guaranteed legendary',
      price: 3000,
      frequency: 'monthly',
      guaranteed: ['1 Legendary card', '2 Epic+ cards'],
      icon: Crown
    }
  ];

  const themedPacks: ThemedPack[] = [
    {
      id: 'major-champions',
      name: 'Major Champions',
      theme: 'Tournament Winners',
      description: 'Cards featuring Major tournament winners',
      price: 2000,
      limited: true,
      expiresAt: '2024-03-15',
      cards: 6,
      guaranteed: ['1 Major Winner card', '1 Epic+ card'],
      icon: Crown
    },
    {
      id: 'rookie-rising',
      name: 'Rising Rookies',
      theme: 'New Talents',
      description: 'Upcoming players making their mark',
      price: 800,
      limited: false,
      cards: 4,
      guaranteed: ['1 Rookie card'],
      icon: Star
    },
    {
      id: 'team-spirit',
      name: 'Team Spirit Pack',
      theme: 'Team Spirit',
      description: 'All cards from the same team',
      price: 1200,
      limited: true,
      expiresAt: '2024-02-28',
      cards: 5,
      guaranteed: ['5 Team Spirit cards'],
      icon: Zap
    }
  ];

  const toggleSubscription = (subscriptionId: string) => {
    setSubscriptions(prev => ({
      ...prev,
      [subscriptionId]: !prev[subscriptionId]
    }));

    const subscription = packSubscriptions.find(s => s.id === subscriptionId);
    if (subscription) {
      toast({
        title: subscriptions[subscriptionId] ? "Subscription Cancelled" : "Subscription Active!",
        description: subscriptions[subscriptionId] 
          ? `${subscription.name} subscription has been cancelled`
          : `${subscription.name} subscription is now active`,
      });
    }
  };

  const purchaseThemedPack = (pack: ThemedPack) => {
    toast({
      title: "Pack Purchased!",
      description: `You bought a ${pack.name} pack`,
    });
  };

  const getDaysRemaining = (expiresAt: string) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="subscriptions">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="subscriptions">
            <Calendar className="mr-2" size={16} />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="themed">
            <Star className="mr-2" size={16} />
            Themed Packs
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2" size={16} />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pack Subscriptions</CardTitle>
              <p className="text-gray-400">Never miss out on new cards with automated deliveries</p>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packSubscriptions.map(subscription => {
              const IconComponent = subscription.icon;
              const isActive = subscriptions[subscription.id];

              return (
                <Card key={subscription.id} className={`${isActive ? 'ring-2 ring-theme-accent' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-theme-accent/20 rounded-lg">
                          <IconComponent size={24} className="text-theme-accent" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{subscription.name}</CardTitle>
                          <Badge variant={isActive ? 'default' : 'outline'}>
                            {isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => toggleSubscription(subscription.id)}
                      />
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-400">{subscription.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Price:</span>
                        <span className="font-semibold">{subscription.price} credits/{subscription.frequency}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm font-semibold">Guaranteed:</span>
                        {subscription.guaranteed.map((guarantee, index) => (
                          <Badge key={index} variant="outline" className="text-xs mr-1">
                            {guarantee}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="text-center mt-4 p-2 bg-theme-gray-dark rounded-lg">
                      {isActive ? (
                        <>
                          <Bell className="h-4 w-4 mx-auto mb-1" />
                          <span className="text-sm">Next delivery in 3 days</span>
                        </>
                      ) : (
                        <span className="text-sm">Subscribe to get regular packs</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="themed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Themed Packs</CardTitle>
              <p className="text-gray-400">Special packs with unique card pools and guarantees</p>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {themedPacks.map(pack => {
              const IconComponent = pack.icon;
              return (
                <Card key={pack.id} className={pack.limited ? 'ring-1 ring-theme-purple' : ''}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-theme-accent/20 rounded-lg">
                          <IconComponent size={24} className="text-theme-accent" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{pack.name}</CardTitle>
                          <span className="text-xs text-gray-400">{pack.theme}</span>
                        </div>
                      </div>
                      {pack.limited && (
                        <Badge className="bg-theme-purple">
                          Limited
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-400">{pack.description}</p>
                    
                    {pack.limited && pack.expiresAt && (
                      <div className="text-center p-2 bg-theme-gray-dark rounded-lg">
                        <Calendar className="h-4 w-4 inline mr-1 text-theme-purple" />
                        <span className="text-sm">
                          {getDaysRemaining(pack.expiresAt)} days remaining
                        </span>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Cards:</span>
                        <span>{pack.cards}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Price:</span>
                        <span className="font-semibold">{pack.price} credits</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm font-semibold">Guaranteed:</span>
                        <div>
                          {pack.guaranteed.map((guarantee, index) => (
                            <Badge key={index} variant="outline" className="text-xs mr-1">
                              {guarantee}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => purchaseThemedPack(pack)}
                      className="w-full bg-theme-accent"
                    >
                      Purchase Pack
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pack Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="automatic-open">Automatic Pack Opening</Label>
                  <p className="text-sm text-gray-400">Open packs automatically when received</p>
                </div>
                <Switch id="automatic-open" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="rare-notifications">Special Card Notifications</Label>
                  <p className="text-sm text-gray-400">Get notified for rare or better cards</p>
                </div>
                <Switch id="rare-notifications" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="pack-analytics">Pack Analytics</Label>
                  <p className="text-sm text-gray-400">Track pack opening statistics</p>
                </div>
                <Switch id="pack-analytics" defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pack History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span>Starter Pack</span>
                <span className="text-sm text-gray-400">2 days ago</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span>Special Edition</span>
                <span className="text-sm text-gray-400">1 week ago</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span>Premium Pack</span>
                <span className="text-sm text-gray-400">2 weeks ago</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span>Starter Pack</span>
                <span className="text-sm text-gray-400">3 weeks ago</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
