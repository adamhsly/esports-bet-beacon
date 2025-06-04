

import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import EsportPage from './pages/EsportPage';
import Index from './pages/Index';
import MatchDetailsPage from './pages/MatchDetailsPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import PlayerDetailPage from './pages/PlayerDetailPage';
import TournamentsPage from './pages/TournamentsPage';
import TournamentDetailPage from './pages/TournamentDetailPage';
import NewsPage from './pages/NewsPage';
import FantasyPage from './pages/FantasyPage';
import CardsPage from './pages/CardsPage';
import AdvancedCardsPage from './pages/AdvancedCardsPage';
import Web3ProfilePage from './pages/Web3ProfilePage';
import NotFound from './pages/NotFound';
import AuthPage from './pages/AuthPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { Web3Provider } from './contexts/Web3Context';
import WelcomePackModal from './components/WelcomePackModal';
import { useWelcomePack } from './hooks/useWelcomePack';
import ErrorBoundary from './components/ErrorBoundary';

import ApiKeyProvider from './components/ApiKeyProvider';
import { Toaster } from './components/ui/toaster';
import { ToastProvider } from './components/ui/toast-provider';
import { ThemeProvider } from './providers/theme-provider';

import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false
    }
  }
});

function AppContent() {
  const {
    showWelcomeModal,
    setShowWelcomeModal,
    welcomeCards,
    packName
  } = useWelcomePack();

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/esports/:gameId?" element={<EsportPage />} />
        <Route path="/matches/:matchId" element={<MatchDetailsPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/teams/:teamId" element={<TeamDetailPage />} />
        <Route path="/players/:playerId" element={<PlayerDetailPage />} />
        <Route path="/tournaments" element={<TournamentsPage />} />
        <Route path="/tournaments/:tournamentId" element={<TournamentDetailPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/fantasy" element={
          <ProtectedRoute>
            <FantasyPage />
          </ProtectedRoute>
        } />
        <Route path="/cards" element={<CardsPage />} />
        <Route path="/advanced-cards" element={
          <ProtectedRoute>
            <AdvancedCardsPage />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Web3ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      <WelcomePackModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        cards={welcomeCards}
        packName={packName}
      />
      
      <Toaster />
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="esports-ui-theme">
        <ToastProvider>
          <AuthProvider>
            <Web3Provider>
              <ApiKeyProvider>
                <AppContent />
              </ApiKeyProvider>
            </Web3Provider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

