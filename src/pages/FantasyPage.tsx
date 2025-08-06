import React, { useState } from 'react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RoundSelector } from '@/components/fantasy/RoundSelector';
import { InProgressRounds } from '@/components/fantasy/InProgressRounds';
import { FinishedRounds } from '@/components/fantasy/FinishedRounds';
import { Calendar, Clock, Trophy } from 'lucide-react';
import { Round } from '@/types/rounds';

// Example rounds – replace with your actual data source
const sampleRounds: Round[] = [
  {
    id: '1',
    type: 'Daily',
    start_date: new Date(),
    end_date: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // 2h later
  },
  {
    id: '2',
    type: 'Weekly',
    start_date: new Date(),
    end_date: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 1 day later
  },
  {
    id: '3',
    type: 'Monthly',
    start_date: new Date(),
    end_date: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week later
  },
];

const FantasyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('join');
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-theme-gray-dark">
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
              <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto bg-gray-800 p-1 rounded-lg shadow-md">
                <TabsTrigger
                  value="join"
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white data-[state=active]:bg-theme-purple data-[state=active]:text-white transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Join a Round
                </TabsTrigger>
                <TabsTrigger
                  value="in-progress"
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white data-[state=active]:bg-theme-purple data-[state=active]:text-white transition-colors"
                >
                  <Clock className="h-4 w-4" />
                  In Progress
                </TabsTrigger>
                <TabsTrigger
                  value="finished"
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white data-[state=active]:bg-theme-purple data-[state=active]:text-white transition-colors"
                >
                  <Trophy className="h-4 w-4" />
                  Finished
                </TabsTrigger>
              </TabsList>

              <TabsContent value="join">
                <RoundSelector
                  rounds={sampleRounds}
                  setSelectedRound={(round) => {
                    setSelectedRound(round);
                    setActiveTab('in-progress'); // Navigate to In Progress after selection
                  }}
                />
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
