
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { FantasyTeamBuilder } from '@/components/fantasy/FantasyTeamBuilder';
import { TournamentCreator } from '@/components/fantasy/TournamentCreator';
import { FantasyLeaderboard } from '@/components/fantasy/FantasyLeaderboard';
import { LiveMatchTracker } from '@/components/fantasy/LiveMatchTracker';
import { SocialPage } from '@/components/fantasy/SocialPage';
import { Users, Trophy, Target, BarChart3, Zap, Globe } from 'lucide-react';

const FantasyPage: React.FC = () => {
  // Using a demo tournament ID for now - in a real app this would come from context or URL params
  const demoTournamentId = "demo-tournament-1";

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">
            <span className="highlight-gradient">Fantasy</span> Esports
          </h1>
          <p className="text-gray-300 max-w-2xl">
            Build your dream CS2 team using your NFT player cards. Compete in fantasy tournaments 
            and leagues with real match performance scoring and live updates.
          </p>
        </div>

        <Tabs defaultValue="team-builder" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="team-builder" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Builder
            </TabsTrigger>
            <TabsTrigger value="live-matches" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Live Matches
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Tournaments
            </TabsTrigger>
            <TabsTrigger value="leaderboards" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Leaderboards
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Social
            </TabsTrigger>
            <TabsTrigger value="my-teams" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              My Teams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team-builder">
            <FantasyTeamBuilder />
          </TabsContent>

          <TabsContent value="live-matches">
            <LiveMatchTracker tournamentId={demoTournamentId} />
          </TabsContent>

          <TabsContent value="tournaments">
            <div className="space-y-6">
              <TournamentCreator />
              {/* Tournament browser will be added later */}
            </div>
          </TabsContent>

          <TabsContent value="leaderboards">
            <FantasyLeaderboard />
          </TabsContent>

          <TabsContent value="social">
            <SocialPage />
          </TabsContent>

          <TabsContent value="my-teams">
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-4">My Fantasy Teams</h3>
              <p className="text-gray-500">
                Your saved fantasy teams will appear here. Create your first team in the Team Builder!
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default FantasyPage;
