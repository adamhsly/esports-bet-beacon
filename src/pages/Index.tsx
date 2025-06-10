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
import { fetchFaceitLiveMatches, fetchFaceitUpcomingMatches } from '@/lib/faceitApi';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, Trophy, Users } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import { getTodayMatches, getUpcomingMatches } from '@/lib/mockData';
import SEOContentBlock from '@/components/SEOContentBlock';
import { Badge } from '@/components/ui/badge';
import { fetchSupabaseFaceitLiveMatches, fetchSupabaseFaceitUpcomingMatches } from '@/lib/supabaseFaceitApi';
import { FaceitSyncButtons } from '@/components/FaceitSyncButtons';
import { DateMatchPicker } from '@/components/DateMatchPicker';
import { filterMatchesByDate, getMatchCountsByDate, formatMatchDate } from '@/utils/dateMatchUtils';
import { fetchSupabaseFaceitMatchesByDate, fetchSupabaseFaceitAllMatches } from '@/lib/supabaseFaceitApi';
import { startOfDay } from 'date-fns';

const Index = () => {
  const [liveMatches, setLiveMatches] = useState<MatchInfo[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchInfo[]>([]);
  const [faceitLiveMatches, setFaceitLiveMatches] = useState<MatchInfo[]>([]);
  const [faceitUpcomingMatches, setFaceitUpcomingMatches] = useState<MatchInfo[]>([]);
  const [loadingLive, setLoadingLive] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingFaceitLive, setLoadingFaceitLive] = useState(true);
  const [loadingFaceitUpcoming, setLoadingFaceitUpcoming] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilteredFaceitLive, setDateFilteredFaceitLive] = useState<MatchInfo[]>([]);
  const [dateFilteredFaceitUpcoming, setDateFilteredFaceitUpcoming] = useState<MatchInfo[]>([]);
  const [allFaceitMatches, setAllFaceitMatches] = useState<MatchInfo[]>([]);
  const [faceitMatchCounts, setFaceitMatchCounts] = useState<Record<string, number>>({});
  const [loadingDateFiltered, setLoadingDateFiltered] = useState(true);
  const { toast } = useToast();
  
  // Fetch live matches and refresh every 30 seconds
  useEffect(() => {
    async function loadLiveMatches() {
      try {
        const csgoMatches = await fetchLiveMatches('csgo');
        setLiveMatches(csgoMatches);
      } catch (error) {
        console.error('Error loading live matches:', error);
        const mockMatches = getTodayMatches('csgo');
        setLiveMatches(mockMatches.slice(0, 3));
      } finally {
        setLoadingLive(false);
      }
    }
    
    loadLiveMatches();
    const interval = setInterval(() => {
      loadLiveMatches();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch FACEIT live matches from Supabase
  useEffect(() => {
    async function loadFaceitLiveMatches() {
      try {
        console.log('🔴 Loading FACEIT live matches...');
        const faceitMatches = await fetchSupabaseFaceitLiveMatches();
        console.log('📊 FACEIT live matches loaded:', faceitMatches.length);
        setFaceitLiveMatches(faceitMatches);
      } catch (error) {
        console.error('Error loading FACEIT live matches:', error);
        setFaceitLiveMatches([]);
      } finally {
        setLoadingFaceitLive(false);
      }
    }
    
    loadFaceitLiveMatches();
    const interval = setInterval(() => {
      loadFaceitLiveMatches();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Fetch upcoming matches
  useEffect(() => {
    async function loadUpcomingMatches() {
      try {
        const csgoMatches = await fetchUpcomingMatches('csgo');
        setUpcomingMatches(csgoMatches.slice(0, 3));
      } catch (error) {
        console.error('Error loading upcoming matches:', error);
        const mockMatches = getUpcomingMatches('csgo');
        setUpcomingMatches(mockMatches.slice(0, 3));
      } finally {
        setLoadingUpcoming(false);
      }
    }
    
    loadUpcomingMatches();
  }, []);

  // Fetch FACEIT upcoming matches from Supabase
  useEffect(() => {
    async function loadFaceitUpcomingMatches() {
      try {
        console.log('📅 Loading FACEIT upcoming matches...');
        const faceitMatches = await fetchSupabaseFaceitUpcomingMatches();
        console.log('📊 FACEIT upcoming matches loaded:', faceitMatches.length);
        setFaceitUpcomingMatches(faceitMatches);
      } catch (error) {
        console.error('Error loading FACEIT upcoming matches:', error);
        setFaceitUpcomingMatches([]);
      } finally {
        setLoadingFaceitUpcoming(false);
      }
    }
    
    loadFaceitUpcomingMatches();
  }, []);

  // Load all FACEIT matches for counting
  useEffect(() => {
    async function loadAllFaceitMatches() {
      try {
        const allMatches = await fetchSupabaseFaceitAllMatches();
        setAllFaceitMatches(allMatches);
        setFaceitMatchCounts(getMatchCountsByDate(allMatches));
      } catch (error) {
        console.error('Error loading all FACEIT matches:', error);
      }
    }
    
    loadAllFaceitMatches();
  }, []);

  // Load date-filtered FACEIT matches
  useEffect(() => {
    async function loadDateFilteredMatches() {
      setLoadingDateFiltered(true);
      try {
        console.log('🗓️ Loading matches for selected date:', selectedDate.toDateString());
        const { live, upcoming } = await fetchSupabaseFaceitMatchesByDate(selectedDate);
        setDateFilteredFaceitLive(live);
        setDateFilteredFaceitUpcoming(upcoming);
      } catch (error) {
        console.error('Error loading date-filtered matches:', error);
        setDateFilteredFaceitLive([]);
        setDateFilteredFaceitUpcoming([]);
      } finally {
        setLoadingDateFiltered(false);
      }
    }
    
    loadDateFilteredMatches();
  }, [selectedDate]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(startOfDay(date));
  };

  const homepageSEOContent = {
    title: "Your Ultimate Esports Betting & Stats Platform",
    paragraphs: [
      "Stay updated with live esports scores from major tournaments and competitions around the world. Our real-time esports match tracker provides second-by-second updates from your favorite games including CS:GO, League of Legends, Dota 2, and Valorant.",
      "Compare esports odds from leading betting sites in one convenient location. Find the best value for your bets with our comprehensive esports odds comparison tool featuring upcoming esports matches across all major titles.",
      "Explore in-depth team stats, performance analytics, and historical match results to inform your betting decisions. Our database tracks player performance, team rankings, and head-to-head statistics from all professional esports competitions.",
      "Whether you're following international championships or regional qualifiers, our platform provides all the information you need to stay ahead of the game with live coverage, match predictions, and expert analysis for the most competitive esports titles."
    ]
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow">
        <Hero />
        
        <div className="container mx-auto px-4 py-12">
          {/* Live Matches - Professional */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-gaming flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-blue-400" />
                <span className="highlight-gradient">Live</span> Pro Matches
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
                <p className="text-gray-400">No live pro matches at the moment.</p>
              </div>
            )}
          </div>

          {/* FACEIT Matches with Date Picker */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-gaming flex items-center">
                <Users className="h-6 w-6 mr-2 text-orange-400" />
                <span className="highlight-gradient">FACEIT</span> Matches
                <Badge variant="outline" className="ml-3 bg-orange-500/20 text-orange-400 border-orange-400/30">
                  Amateur
                </Badge>
              </h2>
              <FaceitSyncButtons />
            </div>

            <DateMatchPicker
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              matchCounts={faceitMatchCounts}
            />

            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-300">
                Matches for {formatMatchDate(selectedDate)}
              </h3>
            </div>

            {loadingDateFiltered ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-orange-400 mr-2" />
                <span>Loading matches for selected date...</span>
              </div>
            ) : (
              <>
                {/* Live Matches for Selected Date */}
                {dateFilteredFaceitLive.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-md font-semibold text-orange-400 mb-4 flex items-center">
                      🔴 Live Now ({dateFilteredFaceitLive.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {dateFilteredFaceitLive.map(match => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Matches for Selected Date */}
                {dateFilteredFaceitUpcoming.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-md font-semibold text-orange-400 mb-4 flex items-center">
                      📅 Upcoming ({dateFilteredFaceitUpcoming.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {dateFilteredFaceitUpcoming.map(match => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  </div>
                )}

                {/* No Matches State */}
                {dateFilteredFaceitLive.length === 0 && dateFilteredFaceitUpcoming.length === 0 && (
                  <div className="text-center py-8 bg-theme-gray-dark/50 rounded-md">
                    <p className="text-gray-400 mb-4">No FACEIT matches scheduled for {formatMatchDate(selectedDate)}.</p>
                    <p className="text-sm text-gray-500">
                      Try selecting a different date or clicking "Sync Live" / "Sync Upcoming" to refresh match data.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Upcoming Matches - Professional */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-gaming flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-blue-400" />
                <span className="highlight-gradient">Upcoming</span> Pro Matches
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
                <p className="text-gray-400">No upcoming pro matches at the moment.</p>
              </div>
            )}
          </div>

          {/* Upcoming Matches - FACEIT Amateur */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-gaming flex items-center">
                <Users className="h-6 w-6 mr-2 text-orange-400" />
                <span className="highlight-gradient">Upcoming</span> Amateur Matches
                <Badge variant="outline" className="ml-3 bg-orange-500/20 text-orange-400 border-orange-400/30">
                  FACEIT
                </Badge>
              </h2>
            </div>
            
            {loadingFaceitUpcoming ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-orange-400 mr-2" />
                <span>Loading FACEIT matches...</span>
              </div>
            ) : faceitUpcomingMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {faceitUpcomingMatches.slice(0, 6).map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-theme-gray-dark/50 rounded-md">
                <p className="text-gray-400 mb-4">No upcoming FACEIT matches at the moment.</p>
                <p className="text-sm text-gray-500">
                  Try clicking "Sync Upcoming" to refresh match data from FACEIT API.
                </p>
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
        
        {/* SEO Content Block */}
        <SEOContentBlock 
          title={homepageSEOContent.title}
          paragraphs={homepageSEOContent.paragraphs}
        />
      </div>
      <Footer />
    </div>
  );
};

export default Index;

</edits_to_apply>
