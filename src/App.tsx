
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from './pages/Index';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import PlayerDetailPage from './pages/PlayerDetailPage';
import TournamentsPage from './pages/TournamentsPage';
import TournamentDetailPage from './pages/TournamentDetailPage';
import NewsPage from './pages/NewsPage';
import MatchDetailsPage from './pages/MatchDetailsPage';
import EsportPage from './pages/EsportPage';
import CardsPage from './pages/CardsPage';
import FantasyPage from './pages/FantasyPage';
import Web3ProfilePage from './pages/Web3ProfilePage';
import NotFound from './pages/NotFound';
import { Toaster } from './components/ui/toaster';
import { ApiKeyProvider } from './components/ApiKeyProvider';
import { Web3Provider } from './contexts/Web3Context';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiKeyProvider>
        <Web3Provider>
          <Router>
            <div className="min-h-screen bg-theme-black text-white">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/cards" element={<CardsPage />} />
                <Route path="/fantasy" element={<FantasyPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/team/:teamId" element={<TeamDetailPage />} />
                <Route path="/player/:playerId" element={<PlayerDetailPage />} />
                <Route path="/tournaments" element={<TournamentsPage />} />
                <Route path="/tournament/:tournamentId" element={<TournamentDetailPage />} />
                <Route path="/news" element={<NewsPage />} />
                <Route path="/match/:matchId" element={<MatchDetailsPage />} />
                <Route path="/esport/:esportType" element={<EsportPage />} />
                <Route path="/profile" element={<Web3ProfilePage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </div>
          </Router>
        </Web3Provider>
      </ApiKeyProvider>
    </QueryClientProvider>
  );
}

export default App;
