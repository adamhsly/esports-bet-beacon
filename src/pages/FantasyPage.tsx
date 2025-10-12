import React, { useState, useEffect } from 'react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RoundSelector } from '@/components/fantasy/RoundSelector';
import { InProgressRounds } from '@/components/fantasy/InProgressRounds';
import { FinishedRounds } from '@/components/fantasy/FinishedRounds';
import { TeamPicker } from '@/components/fantasy/TeamPicker';
import { Calendar, Clock, Trophy, Home } from 'lucide-react';
import { useRPCActions } from '@/hooks/useRPCActions';
import { ProgressHudSticky } from '@/components/fantasy/ProgressHudSticky';
import { ProgressHudSidebar } from '@/components/fantasy/ProgressHudSidebar';
import { useMobile } from '@/hooks/useMobile';


const FantasyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('join');
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { awardXP, progressMission } = useRPCActions();
  const isMobile = useMobile();

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-theme-gray-dark theme-alt-card">
      <SearchableNavbar />

      <div className="flex-grow w-full">
        <div className="mx-2 md:mx-4 my-8">
          {!selectedRound && (
            <div className="mb-8 max-w-2xl mx-auto">
              <h1 className="text-3xl font-bold mb-4 text-theme-purple">
                <span className="[color:_#8B5CF6]">
                  Fantasy Esports
                </span>
              </h1>
              <p className="text-muted-foreground text-base">
                Create teams mixing pro and amateur teams. Higher risk, higher reward with amateur teams getting 25% bonus points.
              </p>
            </div>
          )}

          <div className="max-w-2xl mx-auto">
            {selectedRound ? (
              <div className="mb-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRound(null)}
                  className="flex items-center gap-2 text-white border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <Home className="h-4 w-4 text-white" />
                  Fantasy
                </Button>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto bg-gradient-to-b from-[#3D2B5F] to-[#1F1535] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(139,92,246,0.3)] p-1">
                  <TabsTrigger
                    value="join"
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground data-[state=active]:[background:_#8B5CF6] data-[state=active]:text-white transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    Join a Round
                  </TabsTrigger>
                  <TabsTrigger
                    value="in-progress"
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground data-[state=active]:[background:_#8B5CF6] data-[state=active]:text-white transition-colors"
                  >
                    <Clock className="h-4 w-4" />
                    In Progress
                  </TabsTrigger>
                  <TabsTrigger
                    value="finished"
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground data-[state=active]:[background:_#8B5CF6] data-[state=active]:text-white transition-colors"
                  >
                    <Trophy className="h-4 w-4" />
                    Finished
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="join">
                  {loading ? (
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
            )}

            {selectedRound && (
              <TeamPicker 
                round={selectedRound} 
                onBack={() => setSelectedRound(null)}
                onNavigateToInProgress={() => setActiveTab('in-progress')}
              />
            )}
          </div>
        </div>
      </div>

      <Footer />
      
      {/* Progress HUD - Responsive */}
      {isMobile ? (
        <ProgressHudSticky />
      ) : (
        <div className="fixed bottom-4 right-4 z-50">
          <ProgressHudSidebar />
        </div>
      )}
    </div>
  );
};

export default FantasyPage;
