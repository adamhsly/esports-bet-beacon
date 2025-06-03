import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import EsportPage from '@/pages/EsportPage';
import MatchDetailsPage from '@/pages/MatchDetailsPage';
import TeamDetailPage from '@/pages/TeamDetailPage';
import PlayerDetailPage from '@/pages/PlayerDetailPage';
import TeamsPage from '@/pages/TeamsPage';
import NewsPage from '@/pages/NewsPage';
import NotFound from '@/pages/NotFound';
import TournamentsPage from '@/pages/TournamentsPage';
import TournamentDetailPage from '@/pages/TournamentDetailPage';
import { QueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Web3Provider } from '@/contexts/Web3Context';
import Web3ProfilePage from '@/pages/Web3ProfilePage';

function App() {
  return (
    <QueryClient>
      <BrowserRouter>
        <Web3Provider>
          <Toaster />
          <div className="min-h-screen bg-theme-gray-darkest text-white">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/web3-profile" element={<Web3ProfilePage />} />
              <Route path="/esports/:game" element={<EsportPage />} />
              <Route path="/match/:id" element={<MatchDetailsPage />} />
              <Route path="/team/:teamId" element={<TeamDetailPage />} />
              <Route path="/player/:playerId" element={<PlayerDetailPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/tournament/:id" element={<TournamentDetailPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Web3Provider>
      </BrowserRouter>
    </QueryClient>
  );
}

export default App;
