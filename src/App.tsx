
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ToastProvider } from '@/components/ui/toast-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { Web3Provider } from '@/contexts/Web3Context';
import { LineupSharePage } from '@/pages/LineupSharePage';
import Index from '@/pages/Index';
import EsportPage from '@/pages/EsportPage';
import TournamentsPage from '@/pages/TournamentsPage';
import TournamentDetailPage from '@/pages/TournamentDetailPage';
import TeamsPage from '@/pages/TeamsPage';
import TeamDetailPage from '@/pages/TeamDetailPage';
import PlayerDetailPage from '@/pages/PlayerDetailPage';
import MatchDetailsPage from '@/pages/MatchDetailsPage';
import FaceitMatchPage from '@/pages/FaceitMatchPage';
import PandaScoreUpcomingMatchPage from '@/pages/PandaScoreUpcomingMatchPage';
import PandaScoreLiveMatchPage from '@/pages/PandaScoreLiveMatchPage';
import NewsPage from '@/pages/NewsPage';
import CardsPage from '@/pages/CardsPage';
import AdvancedCardsPage from '@/pages/AdvancedCardsPage';
import FantasyPage from '@/pages/FantasyPage';
import { PrivateRoundPage } from '@/pages/PrivateRoundPage';
import { CreatePrivateRoundPage } from '@/pages/CreatePrivateRoundPage';
import AuthPage from '@/pages/AuthPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import Web3ProfilePage from '@/pages/Web3ProfilePage';
import PremiumSuccessPage from '@/pages/PremiumSuccessPage';
import PremiumCancelPage from '@/pages/PremiumCancelPage';
import WelcomePage from '@/pages/WelcomePage';
import NotFound from '@/pages/NotFound';
import LegalPage from '@/pages/LegalPage';
import PrivacyPage from '@/pages/PrivacyPage';
import TermsPage from '@/pages/TermsPage';
import CookiePage from '@/pages/CookiePage';
import LegacyPrivacyRedirect from '@/components/redirects/LegacyPrivacyRedirect';
import LegacyTermsRedirect from '@/components/redirects/LegacyTermsRedirect';
import { ProfileSheet, useProfilePanel } from '@/components/ProfileSheet';
import { StickyProfileHud } from '@/components/StickyProfileHud';
import { ProgressHudSticky } from '@/components/fantasy/ProgressHudSticky';
import { RoundWinnerCelebrationModal } from '@/components/RoundWinnerCelebrationModal';
import { useRoundWinnerNotifications } from '@/hooks/useRoundWinnerNotifications';
import { useMobile } from '@/hooks/useMobile';
import { useLocation } from 'react-router-dom';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.code === 'PGRST301' || error?.message?.includes('not authenticated')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
});

// Component that handles winner notifications - must be inside AuthProvider
const WinnerNotificationHandler: React.FC = () => {
  const { unviewedWins, markAsViewed } = useRoundWinnerNotifications();
  const [isClosing, setIsClosing] = React.useState(false);

  const handleCloseWinner = async () => {
    if (unviewedWins.length > 0 && !isClosing) {
      setIsClosing(true);
      try {
        // Wait for the database update to complete
        await markAsViewed(unviewedWins[0].id);
      } catch (error) {
        console.error('Error marking winner as viewed:', error);
      } finally {
        setIsClosing(false);
      }
    }
  };

  return (
    <RoundWinnerCelebrationModal
      winner={unviewedWins.length > 0 && !isClosing ? unviewedWins[0] : null}
      onClose={handleCloseWinner}
    />
  );
};

const QueryClientWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOpen, openProfile, closeProfile } = useProfilePanel();
  const isMobile = useMobile();
  const location = useLocation();
  
  // Don't show ProgressHudSticky on fantasy page or public lineup share pages
  const isFantasyPage = location.pathname === '/fantasy';
  const isLineupSharePage = location.pathname.startsWith('/lineup/');
  const showProgressHud = isMobile && !isFantasyPage && !isLineupSharePage;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <Web3Provider>
            {children}
            {!isMobile && <StickyProfileHud onClick={openProfile} />}
            {showProgressHud && <ProgressHudSticky />}
            <ProfileSheet isOpen={isOpen} onOpenChange={(open) => open ? openProfile() : closeProfile()} />
            <WinnerNotificationHandler />
            <Toaster />
          </Web3Provider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

function App() {
  return (
    <Router>
      <QueryClientWrapper>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/esports/:gameType" element={<EsportPage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournament/:tournamentId" element={<TournamentDetailPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/team/:id" element={<TeamDetailPage />} />
          <Route path="/player/:id" element={<PlayerDetailPage />} />
          <Route path="/match/:matchId" element={<MatchDetailsPage />} />
          {/* Unified FACEIT match page - handles all statuses */}
          <Route path="/faceit/match/:matchId" element={<FaceitMatchPage />} />
          <Route path="/faceit/live/:matchId" element={<FaceitMatchPage />} />
          <Route path="/faceit/finished/:matchId" element={<FaceitMatchPage />} />
          <Route path="/pandascore/match/:matchId" element={<PandaScoreUpcomingMatchPage />} />
          <Route path="/pandascore/live/:matchId" element={<PandaScoreLiveMatchPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/cards" element={<CardsPage />} />
          <Route path="/advanced-cards" element={<AdvancedCardsPage />} />
          <Route path="/fantasy" element={<FantasyPage />} />
          <Route path="/fantasy/private" element={<PrivateRoundPage />} />
          <Route path="/fantasy/private/create" element={<CreatePrivateRoundPage />} />
          <Route path="/lineup/:roundId/:userId" element={<LineupSharePage />} />
          <Route path="/lineup/:roundId/:userId" element={<LineupSharePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/profile" element={<Web3ProfilePage />} />
          <Route path="/web3-profile" element={<Web3ProfilePage />} />
          <Route path="/premium/success" element={<PremiumSuccessPage />} />
          <Route path="/premium/cancel" element={<PremiumCancelPage />} />
          {/* Legal pages - specific routes only for debugging */}
          <Route path="/legal/privacy" element={<PrivacyPage />} />
          <Route path="/legal/terms" element={<TermsPage />} />
          <Route path="/legal/cookies" element={<CookiePage />} />
          {/* Legacy redirects for SEO preservation */}
          <Route path="/privacy" element={<LegacyPrivacyRedirect />} />
          <Route path="/terms" element={<LegacyTermsRedirect />} />
          <Route path="/privacy-policy" element={<LegacyPrivacyRedirect />} />
          <Route path="/terms-of-service" element={<LegacyTermsRedirect />} />
          <Route path="/tos" element={<LegacyTermsRedirect />} />
          <Route path="/legal/privacy-policy" element={<LegacyPrivacyRedirect />} />
          <Route path="/legal/tos" element={<LegacyTermsRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </QueryClientWrapper>
    </Router>
  );
}

export default App;
