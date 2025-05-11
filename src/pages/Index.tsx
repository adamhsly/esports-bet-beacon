
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Hero from '@/components/Hero';
import FeaturedGames from '@/components/FeaturedGames';
import TopBettingSites from '@/components/TopBettingSites';
import PromoBanner from '@/components/PromoBanner';
import Testimonials from '@/components/Testimonials';
import Footer from '@/components/Footer';
import EsportsNavigation from '@/components/EsportsNavigation';
import { MatchCard, MatchInfo } from '@/components/MatchCard';
import { fetchLiveMatches, fetchUpcomingMatches } from '@/lib/sportDevsApi';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, Trophy } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import { getTodayMatches, getUpcomingMatches } from '@/lib/mockData';

const Index = () => {
  const [liveMatches, setLiveMatches] = useState<MatchInfo[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchInfo[]>([]);
  const [loadingLive, setLoadingLive] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const { toast } = useToast();
  
  // Fetch live matches and refresh every 10 seconds
  useEffect(() => {
    async function loadLiveMatches() {
      try {
        const csgoMatches = await fetchLiveMatches('csgo');
        setLiveMatches(csgoMatches);
      } catch (error) {
        console.error('Error loading live matches:', error);
        // Use mock data if API fails
        const mockMatches = getTodayMatches('csgo');
        setLiveMatches(mockMatches.slice(0, 3));
      } finally {
        setLoadingLive(false);
      }
    }
    
    loadLiveMatches();
    
    // Set up polling every 10 seconds
    const interval = setInterval(() => {
      loadLiveMatches();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Fetch upcoming matches
  useEffect(() => {
    async function loadUpcomingMatches() {
      try {
        const csgoMatches = await fetchUpcomingMatches('csgo');
        setUpcomingMatches(csgoMatches.slice(0, 3)); // Get just 3 for homepage
      } catch (error) {
        console.error('Error loading upcoming matches:', error);
        // Use mock data if API fails
        const mockMatches = getUpcomingMatches('csgo');
        setUpcomingMatches(mockMatches.slice(0, 3));
      } finally {
        setLoadingUpcoming(false);
      }
    }
    
    loadUpcomingMatches();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow">
        <Hero />
        
        <div className="container mx-auto px-4 py-12">
          {/* Live Matches */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-gaming">
                <span className="highlight-gradient">Live</span> Matches
              </h2>
              <Button asChild variant="ghost" className="text-theme-purple hover:text-theme-purple hover:bg-theme-purple/10">
                <Link to="/esports/csgo">
                  View All <ArrowRight size={16} className="ml-1" />
                </Link>
              </Button>
            </div>
            
            {loadingLive ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-theme-purple mr-2" />
                <span>Loading live matches...</span>
              </div>
            ) : liveMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveMatches.slice(0, 3).map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-theme-gray-dark/50 rounded-md">
                <p className="text-gray-400">No live matches at the moment. Check back later!</p>
              </div>
            )}
          </div>
          
          {/* Upcoming Matches */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-gaming">
                <span className="highlight-gradient">Upcoming</span> Matches
              </h2>
              <Button asChild variant="ghost" className="text-theme-purple hover:text-theme-purple hover:bg-theme-purple/10">
                <Link to="/esports/csgo">
                  View All <ArrowRight size={16} className="ml-1" />
                </Link>
              </Button>
            </div>
            
            {loadingUpcoming ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-theme-purple mr-2" />
                <span>Loading upcoming matches...</span>
              </div>
            ) : upcomingMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingMatches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-theme-gray-dark/50 rounded-md">
                <p className="text-gray-400">No upcoming matches at the moment. Check back later!</p>
              </div>
            )}
          </div>
          
          {/* Tournaments Section */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-gaming">
                <span className="highlight-gradient">Active</span> Tournaments
              </h2>
              <Button asChild variant="ghost" className="text-theme-purple hover:text-theme-purple hover:bg-theme-purple/10">
                <Link to="/tournaments">
                  View All <ArrowRight size={16} className="ml-1" />
                </Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Featured Tournament Cards */}
              <div className="bg-theme-gray-dark border border-theme-gray-medium p-4 rounded-md hover:border-theme-purple transition-all flex flex-col">
                <div className="flex items-center mb-3">
                  <Trophy size={20} className="text-theme-purple mr-2" />
                  <h3 className="font-bold">ESL Pro League Season 17</h3>
                </div>
                <div className="text-sm text-gray-400 mb-3">
                  Mar 23, 2023 - Apr 10, 2023 • CS:GO
                </div>
                <div className="text-sm mb-3">
                  <span className="text-theme-green">$850,000</span> Prize Pool
                </div>
                <div className="mt-auto text-right">
                  <Button asChild variant="ghost" size="sm" className="text-theme-purple hover:bg-theme-purple/10">
                    <Link to="/tournament/1">
                      View Details <ArrowRight size={14} className="ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div className="bg-theme-gray-dark border border-theme-gray-medium p-4 rounded-md hover:border-theme-purple transition-all flex flex-col">
                <div className="flex items-center mb-3">
                  <Trophy size={20} className="text-theme-purple mr-2" />
                  <h3 className="font-bold">BLAST Premier: Spring Finals 2023</h3>
                </div>
                <div className="text-sm text-gray-400 mb-3">
                  Jun 7, 2023 - Jun 11, 2023 • CS:GO
                </div>
                <div className="text-sm mb-3">
                  <span className="text-theme-green">$425,000</span> Prize Pool
                </div>
                <div className="mt-auto text-right">
                  <Button asChild variant="ghost" size="sm" className="text-theme-purple hover:bg-theme-purple/10">
                    <Link to="/tournament/2">
                      View Details <ArrowRight size={14} className="ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div className="bg-theme-gray-dark border border-theme-gray-medium p-4 rounded-md hover:border-theme-purple transition-all flex flex-col">
                <div className="flex items-center mb-3">
                  <Trophy size={20} className="text-theme-purple mr-2" />
                  <h3 className="font-bold">VCT Masters Tokyo</h3>
                </div>
                <div className="text-sm text-gray-400 mb-3">
                  Jun 1, 2023 - Jun 25, 2023 • Valorant
                </div>
                <div className="text-sm mb-3">
                  <span className="text-theme-green">$685,000</span> Prize Pool
                </div>
                <div className="mt-auto text-right">
                  <Button asChild variant="ghost" size="sm" className="text-theme-purple hover:bg-theme-purple/10">
                    <Link to="/tournament/3">
                      View Details <ArrowRight size={14} className="ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-10">
            <h2 className="text-2xl font-bold font-gaming mb-6 text-center">
              <span className="highlight-gradient">Compare Odds</span> Across Esports
            </h2>
            <p className="text-gray-300 text-center mb-8">
              Find the best betting odds for your favorite esports games and matches. 
              Compare offers from multiple bookmakers all in one place.
            </p>
            <EsportsNavigation />
            <div className="text-center mt-6">
              <Button asChild className="bg-theme-purple hover:bg-theme-purple/90">
                <Link to="/esports/csgo">View All Esports Odds</Link>
              </Button>
            </div>
          </div>
        </div>
        
        <FeaturedGames />
        <TopBettingSites />
        <PromoBanner />
        <Testimonials />
      </div>
      <Footer />
    </div>
  );
};

export default Index;
