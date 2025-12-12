import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RoundSelector } from '@/components/fantasy/RoundSelector';
import { InProgressRounds } from '@/components/fantasy/InProgressRounds';
import { FinishedRounds } from '@/components/fantasy/FinishedRounds';
import { TeamPicker } from '@/components/fantasy/TeamPickerUpdated';
import { MyPrivateRounds } from '@/components/fantasy/MyPrivateRounds';
import { Calendar, Clock, Trophy, Home, Users } from 'lucide-react';
import { useRPCActions } from '@/hooks/useRPCActions';
import { ProgressHudSticky } from '@/components/fantasy/ProgressHudSticky';
import { ProgressHudSidebar } from '@/components/fantasy/ProgressHudSidebar';
import { useMobile } from '@/hooks/useMobile';
import { FantasyRulesModal } from '@/components/fantasy/FantasyRulesModal';
import { BookOpen } from 'lucide-react';
import { useProfilePanel } from '@/components/ProfileSheet';
import { ProfileSheet } from '@/components/ProfileSheet';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';


const FantasyPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('join');
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const { awardXP, progressMission } = useRPCActions();
  const isMobile = useMobile();
  const { isOpen, openProfile, closeProfile } = useProfilePanel();

  const banners = [
    {
      src: '/lovable-uploads/build_roster_banner.png',
      alt: 'Draft your ultimate roster - Pick teams and win prizes'
    },
    {
      src: '/lovable-uploads/team_swap_banner.png',
      alt: 'Use your in-round team swap and star team change wisely'
    },
    {
      src: '/lovable-uploads/Spend_5_Get_10.png',
      alt: 'Spend $5 - Get $10! New users first $5 of paid entries unlocks $10 in bonus credits'
    }
  ];

  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  // Handle roundId from URL parameters
  useEffect(() => {
    const roundId = searchParams.get('roundId');
    if (roundId && !selectedRound) {
      // Fetch the round details and select it
      const fetchRound = async () => {
        try {
          const { data, error } = await supabase
            .from('fantasy_rounds')
            .select('*')
            .eq('id', roundId)
            .single();
          
          if (data && !error) {
            setSelectedRound(data);
            // Clear the URL parameter after selecting
            searchParams.delete('roundId');
            setSearchParams(searchParams);
          }
        } catch (err) {
          console.error('Error fetching round:', err);
        }
      };
      fetchRound();
    }
  }, [searchParams, selectedRound, setSearchParams]);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-theme-gray-dark theme-alt-card">
      <SearchableNavbar />

      <div className="flex-grow w-full">
        <div className="mx-2 md:mx-4 my-8">
          {!selectedRound && (
            <div className="mb-8 max-w-4xl mx-auto">
              <Carousel
                plugins={[plugin.current]}
                className="w-full md:w-3/4 mx-auto"
              >
                <CarouselContent>
                  {banners.map((banner, index) => (
                    <CarouselItem key={index}>
                      <img 
                        src={banner.src}
                        alt={banner.alt}
                        className="w-full rounded-xl"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
              <button
                onClick={() => setRulesModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm text-[#8B5CF6] hover:text-[#7C3AED] transition-colors mt-4"
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
                <div className="w-full overflow-x-auto scrollbar-hide">
                  <TabsList className="inline-flex bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] rounded-[10px] p-1.5 gap-1.5 min-w-full md:w-auto md:mx-auto">
                    <TabsTrigger
                      value="join"
                      className="flex-1 min-w-[120px] whitespace-nowrap text-center py-2.5 px-4 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white flex items-center justify-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Join a Round
                    </TabsTrigger>
                    <TabsTrigger
                      value="in-progress"
                      className="flex-1 min-w-[120px] whitespace-nowrap text-center py-2.5 px-4 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white flex items-center justify-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      In Progress
                    </TabsTrigger>
                    <TabsTrigger
                      value="finished"
                      className="flex-1 min-w-[120px] whitespace-nowrap text-center py-2.5 px-4 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white flex items-center justify-center gap-2"
                    >
                      <Trophy className="h-4 w-4" />
                      Finished
                    </TabsTrigger>
                    <TabsTrigger
                      value="my-private"
                      className="flex-1 min-w-[120px] whitespace-nowrap text-center py-2.5 px-4 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white flex items-center justify-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      My Private Rounds
                    </TabsTrigger>
                  </TabsList>
                </div>

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

                <TabsContent value="my-private">
                  <ProtectedRoute>
                    <MyPrivateRounds onSelectRound={setSelectedRound} />
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
          <ProgressHudSidebar onClick={openProfile} />
        </div>
      )}

      {/* Fantasy Rules Modal */}
      <FantasyRulesModal open={rulesModalOpen} onOpenChange={setRulesModalOpen} />
      
      {/* Profile Sheet */}
      <ProfileSheet isOpen={isOpen} onOpenChange={closeProfile} />
    </div>
  );
};

export default FantasyPage;
