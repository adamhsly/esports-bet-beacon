
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
import AuthPage from '@/pages/AuthPage';
import Web3ProfilePage from '@/pages/Web3ProfilePage';
import NotFound from '@/pages/NotFound';
import { StickyProfileHud } from '@/components/StickyProfileHud';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      retry: 1,
    },
  },
});

const QueryClientWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <Web3Provider>
            {children}
            <StickyProfileHud />
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
          <Route path="/lineup/:roundId/:userId" element={<LineupSharePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/profile" element={<Web3ProfilePage />} />
          <Route path="/web3-profile" element={<Web3ProfilePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </QueryClientWrapper>
    </Router>
  );
}

export default App;
