
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PrivateLeagueCreator } from './PrivateLeagueCreator';
import { LeagueBrowser } from './LeagueBrowser';
import { CardMarketplace } from './CardMarketplace';
import { Users, Trophy, ShoppingCart, Award } from 'lucide-react';

export const SocialPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">
          <span className="highlight-gradient">Social</span> Features
        </h1>
        <p className="text-gray-300 max-w-2xl">
          Create private leagues, compete with friends, and trade cards in the marketplace. 
          Build your fantasy community and climb the leaderboards together!
        </p>
      </div>

      <Tabs defaultValue="leagues" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="leagues" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Leagues
          </TabsTrigger>
          <TabsTrigger value="create-league" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Create League
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leagues">
          <LeagueBrowser />
        </TabsContent>

        <TabsContent value="create-league">
          <PrivateLeagueCreator />
        </TabsContent>

        <TabsContent value="marketplace">
          <CardMarketplace />
        </TabsContent>

        <TabsContent value="achievements">
          <div className="text-center py-12">
            <Award className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-4">Achievements Coming Soon</h3>
            <p className="text-gray-500">
              Track your fantasy accomplishments, unlock badges, and earn rewards for your achievements!
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
