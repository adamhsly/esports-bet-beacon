
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { OddsTable, Market, BookmakerOdds } from '@/components/OddsTable';
import Footer from '@/components/Footer';
import { getMatchById } from '@/lib/mockData';
import { ArrowLeft } from 'lucide-react';

const MatchDetailsPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  
  // In a real application, you would fetch this data from an API
  const match = getMatchById(matchId || '');
  
  if (!match) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow container mx-auto px-4 py-12 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-4">Match not found</h1>
          <Link to="/esports/csgo" className="text-theme-purple hover:underline flex items-center">
            <ArrowLeft size={16} className="mr-1" /> Back to matches
          </Link>
        </div>
        <Footer />
      </div>
    );
  }
  
  // Sample markets data - in a real app this would come from your API
  const markets: Market[] = [
    { name: 'Match Winner', options: ['Team A', 'Team B'] },
    { name: 'Map 1 Winner', options: ['Team A', 'Team B'] },
    { name: 'Total Maps', options: ['Over 2.5', 'Under 2.5'] },
  ];
  
  // Sample bookmaker odds data - in a real app this would come from your API
  const bookmakerOdds: BookmakerOdds[] = [
    {
      bookmaker: 'BetMaster',
      logo: '/placeholder.svg',
      odds: { 'Team A': '1.85', 'Team B': '1.95' },
      link: '#',
    },
    {
      bookmaker: 'GG.bet',
      logo: '/placeholder.svg',
      odds: { 'Team A': '1.90', 'Team B': '1.90' },
      link: '#',
    },
    {
      bookmaker: 'Betway',
      logo: '/placeholder.svg',
      odds: { 'Team A': '1.83', 'Team B': '1.97' },
      link: '#',
    },
    {
      bookmaker: 'Unikrn',
      logo: '/placeholder.svg',
      odds: { 'Team A': '1.87', 'Team B': '1.93' },
      link: '#',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to={`/esports/${match.esportType}`} className="text-theme-purple hover:underline flex items-center">
            <ArrowLeft size={16} className="mr-1" /> Back to {match.esportType.toUpperCase()} matches
          </Link>
        </div>
        
        <div className="bg-theme-gray-dark border border-theme-gray-medium rounded-lg p-6 mb-8">
          <div className="text-sm text-gray-400 mb-2">{match.tournament} • BO{match.bestOf}</div>
          
          <div className="flex flex-col md:flex-row justify-between items-center my-8 gap-6">
            <div className="flex flex-col items-center text-center md:w-1/3">
              <img 
                src={match.teams[0].logo || '/placeholder.svg'} 
                alt={match.teams[0].name} 
                className="w-20 h-20 object-contain mb-3" 
              />
              <h2 className="text-xl font-bold text-white">{match.teams[0].name}</h2>
            </div>
            
            <div className="flex flex-col items-center md:w-1/3">
              <div className="text-2xl font-bold text-white mb-2">VS</div>
              <div className="flex items-center text-gray-400 text-sm">
                {new Date(match.startTime).toLocaleString('en-US', {
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            
            <div className="flex flex-col items-center text-center md:w-1/3">
              <img 
                src={match.teams[1].logo || '/placeholder.svg'} 
                alt={match.teams[1].name} 
                className="w-20 h-20 object-contain mb-3" 
              />
              <h2 className="text-xl font-bold text-white">{match.teams[1].name}</h2>
            </div>
          </div>
        </div>
        
        <OddsTable 
          bookmakerOdds={bookmakerOdds} 
          markets={markets} 
        />
      </div>
      <Footer />
    </div>
  );
};

export default MatchDetailsPage;
