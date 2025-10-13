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
import { FantasyRulesModal } from '@/components/fantasy/FantasyRulesModal';
import { BookOpen } from 'lucide-react';


const FantasyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('join');
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
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
              <button
                onClick={() => setRulesModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm text-[#8B5CF6] hover:text-[#7C3AED] transition-colors mt-2"
              >
                <BookOpen className="h-4 w-4" />
                View Rules & Scoring
              </button>
            </div>
          )}

          <div className="max-w-2xl mx-auto">
            {selectedRound ? (
              <div className="mb-6">
                <Button
                  onClick={() => setSelectedRound(null)}
                  className="flex items-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium"
                >
                  <Home className="h-4 w-4" />
                  Fantasy
                </Button>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="flex bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] rounded-[10px] p-1.5 gap-1.5 max-w-md mx-auto">
                  <TabsTrigger
                    value="join"
                    className="flex-1 text-center py-2.5 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white flex items-center justify-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Join a Round
                  </TabsTrigger>
                  <TabsTrigger
                    value="in-progress"
                    className="flex-1 text-center py-2.5 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white flex items-center justify-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    In Progress
                  </TabsTrigger>
                  <TabsTrigger
                    value="finished"
                    className="flex-1 text-center py-2.5 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white flex items-center justify-center gap-2"
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

      {/* Fantasy Rules Modal */}
      <FantasyRulesModal open={rulesModalOpen} onOpenChange={setRulesModalOpen} />
    </div>
  );
};

export default FantasyPage;
