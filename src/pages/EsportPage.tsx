
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import EsportsNavigation from '@/components/EsportsNavigation';
import { MatchCard, MatchInfo } from '@/components/MatchCard';
import Footer from '@/components/Footer';
import { getTodayMatches, getUpcomingMatches } from '@/lib/mockData';
import { fetchUpcomingMatches } from '@/lib/pandaScoreApi';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const EsportPage: React.FC = () => {
  const { esportId = 'csgo' } = useParams<{ esportId: string }>();
  const [todayMatches, setTodayMatches] = useState<MatchInfo[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const loadMatches = async () => {
      setLoading(true);
      try {
        console.log(`EsportPage: Loading matches for ${esportId}`);
        // Use PandaScore API directly
        const matches = await fetchUpcomingMatches(esportId);
        
        // Split matches into today and upcoming based on start time
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayMatches: MatchInfo[] = [];
        const upcomingMatches: MatchInfo[] = [];
        
        matches.forEach(match => {
          const matchDate = new Date(match.startTime);
          if (matchDate >= today && matchDate < tomorrow) {
            todayMatches.push(match);
          } else if (matchDate >= tomorrow) {
            upcomingMatches.push(match);
          }
        });
        
        console.log(`EsportPage: Loaded ${todayMatches.length} matches for today and ${upcomingMatches.length} upcoming matches`);
        setTodayMatches(todayMatches);
        setUpcomingMatches(upcomingMatches);
      } catch (error) {
        console.error('Error loading matches:', error);
        toast({
          title: "Error loading matches",
          description: "Falling back to sample data.",
          variant: "destructive",
        });
        
        // Fallback to mock data
        setTodayMatches(getTodayMatches(esportId));
        setUpcomingMatches(getUpcomingMatches(esportId));
      } finally {
        setLoading(false);
      }
    };
    
    loadMatches();
  }, [esportId, toast]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold font-gaming mb-6">
          <span className="highlight-gradient">{esportId.toUpperCase()}</span> Betting Odds
        </h1>
        
        <EsportsNavigation activeEsport={esportId} />
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-theme-purple" />
          </div>
        ) : (
          <>
            <section className="mb-12">
              <h2 className="text-xl font-bold mb-6 text-white">Today's Matches</h2>
              {todayMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {todayMatches.map(match => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  No matches scheduled for today.
                </div>
              )}
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-6 text-white">Upcoming Matches</h2>
              {upcomingMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingMatches.map(match => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  No upcoming matches found.
                </div>
              )}
            </section>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default EsportPage;
