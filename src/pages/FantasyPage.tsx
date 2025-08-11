import React, { useState, useEffect } from 'react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RoundSelector } from '@/components/fantasy/RoundSelector';
import { InProgressRounds } from '@/components/fantasy/InProgressRounds';
import { FinishedRounds } from '@/components/fantasy/FinishedRounds';
import { TeamPicker } from '@/components/fantasy/TeamPicker';
import { Calendar, Clock, Trophy } from 'lucide-react';


const FantasyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('join');
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRounds() {
      try {
        const res = await fetch('/api/rounds'); // adjust the endpoint if needed
        if (!res.ok) throw new Error('Failed to fetch rounds');
        const data = await res.json();
        console.log('Fetched rounds:', data); // Debug: check what comes from DB
        setRounds(data);
      } catch (err) {
        console.error('Error fetching rounds:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRounds();
  }, []);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-theme-gray-dark theme-alt-card">
      <SearchableNavbar />

      <div className="flex-grow w-full">
        <div className="mx-2 md:mx-4 my-8">
          <div className="mb-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-4 text-theme-purple">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Fantasy Esports
              </span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Create teams mixing pro and amateur teams. Higher risk, higher reward with amateur teams getting 25% bonus points.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto bg-muted p-1 rounded-lg shadow-md">
                <TabsTrigger
                  value="join"
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Join a Round
                </TabsTrigger>
                <TabsTrigger
                  value="in-progress"
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
                >
                  <Clock className="h-4 w-4" />
                  In Progress
                </TabsTrigger>
                <TabsTrigger
                  value="finished"
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
                >
                  <Trophy className="h-4 w-4" />
                  Finished
                </TabsTrigger>
              </TabsList>

              <TabsContent value="join">
                {selectedRound ? (
                  <TeamPicker 
                    round={selectedRound} 
                    onBack={() => setSelectedRound(null)}
                    onNavigateToInProgress={() => setActiveTab('in-progress')}
                  />
                ) : loading ? (
                  <p className="text-muted-foreground text-center mt-4">Loading rounds...</p>
                ) : (
                  <RoundSelector 
                    onNavigateToInProgress={() => setActiveTab('in-progress')} 
                    onJoinRound={setSelectedRound}
                  />
                )}
              </TabsContent>

              <TabsContent value="in-progress">
                <ProtectedRoute>
                  <InProgressRounds />
                </ProtectedRoute>
              </TabsContent>

              <TabsContent value="finished">
                <ProtectedRoute>
                  <FinishedRounds />
                </ProtectedRoute>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FantasyPage;
