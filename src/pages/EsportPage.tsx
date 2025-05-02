
import React from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import EsportsNavigation from '@/components/EsportsNavigation';
import { MatchCard, MatchInfo } from '@/components/MatchCard';
import Footer from '@/components/Footer';
import { getTodayMatches, getUpcomingMatches } from '@/lib/mockData';

const EsportPage: React.FC = () => {
  const { esportId = 'csgo' } = useParams<{ esportId: string }>();
  
  // In a real application, you would fetch this data from an API
  const todayMatches = getTodayMatches(esportId);
  const upcomingMatches = getUpcomingMatches(esportId);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold font-gaming mb-6">
          <span className="highlight-gradient">{esportId.toUpperCase()}</span> Betting Odds
        </h1>
        
        <EsportsNavigation activeEsport={esportId} />
        
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6 text-white">Today's Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {todayMatches.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
        
        <section>
          <h2 className="text-xl font-bold mb-6 text-white">Upcoming Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingMatches.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default EsportPage;
