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
import { Loader2, ArrowRight, Trophy, Users } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import { getTodayMatches, getUpcomingMatches } from '@/lib/mockData';
import SEOContentBlock from '@/components/SEOContentBlock';
import { Badge } from '@/components/ui/badge';
import { fetchSupabaseFaceitAllMatches, fetchSupabaseFaceitMatchesByDate } from '@/lib/supabaseFaceitApi';
import { FaceitSyncButtons } from '@/components/FaceitSyncButtons';
import { DateMatchPicker } from '@/components/DateMatchPicker';
import { getMatchCountsByDate, formatMatchDate } from '@/utils/dateMatchUtils';
import { startOfDay } from 'date-fns';

const Index = () => {
  const [proLiveMatches, setProLiveMatches] = useState<MatchInfo[]>([]);
  const [proUpcomingMatches, setProUpcomingMatches] = useState<MatchInfo[]>([]);
  const [loadingProLive, setLoadingProLive] = useState(true);
  const [loadingProUpcoming, setLoadingProUpcoming] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilteredLiveMatches, setDateFilteredLiveMatches] = useState<MatchInfo[]>([]);
  const [dateFilteredUpcomingMatches, setDateFilteredUpcomingMatches] = useState<MatchInfo[]>([]);
  const [allFaceitMatches, setAllFaceitMatches] = useState<MatchInfo[]>([]);
  const [faceitMatchCounts, setFaceitMatchCounts] = useState<Record<string, number>>({});
  const [loadingDateFiltered, setLoadingDateFiltered] = useState(true);
  const { toast } = useToast();
  
  // Fetch professional live matches and refresh every 30 seconds
  useEffect(() => {
    async function loadProLiveMatches() {
      try {
        const csgoMatches = await fetchLiveMatches('csgo');
        setProLiveMatches(csgoMatches);
      } catch (error) {
        console.error('Error loading pro live matches:', error);
        const mockMatches = getTodayMatches('csgo');
        setProLiveMatches(mockMatches.slice(0, 3));
      } finally {
        setLoadingProLive(false);
      }
    }
    
    loadProLiveMatches();
    const interval = setInterval(() => {
      loadProLiveMatches();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Fetch professional upcoming matches
  useEffect(() => {
    async function loadProUpcomingMatches() {
      try {
        const csgoMatches = await fetchUpcomingMatches('csgo');
        setProUpcomingMatches(csgoMatches.slice(0, 3));
      } catch (error) {
        console.error('Error loading pro upcoming matches:', error);
        const mockMatches = getUpcomingMatches('csgo');
        setProUpcomingMatches(mockMatches.slice(0, 3));
      } finally {
        setLoadingProUpcoming(false);
      }
    }
    
    loadProUpcomingMatches();
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

  // Load date-filtered matches (combining FACEIT and professional)
  useEffect(() => {
    async function loadDateFilteredMatches() {
      setLoadingDateFiltered(true);
      try {
        console.log('🗓️ Loading matches for selected date:', selectedDate.toDateString());
        
        // Fetch FACEIT matches for the selected date
        const { live: faceitLive, upcoming: faceitUpcoming } = await fetchSupabaseFaceitMatchesByDate(selectedDate);
        
        // Filter professional matches for the selected date
        const selectedDateStart = startOfDay(selectedDate);
        const selectedDateEnd = new Date(selectedDateStart);
        selectedDateEnd.setHours(23, 59, 59, 999);
        
        const filteredProLive = proLiveMatches.filter(match => {
          const matchDate = new Date(match.startTime);
          return matchDate >= selectedDateStart && matchDate <= selectedDateEnd;
        });
        
        const filteredProUpcoming = proUpcomingMatches.filter(match => {
          const matchDate = new Date(match.startTime);
          return matchDate >= selectedDateStart && matchDate <= selectedDateEnd;
        });
        
        // Combine and sort matches
        const allLiveMatches = [...faceitLive, ...filteredProLive].sort((a, b) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        
        const allUpcomingMatches = [...faceitUpcoming, ...filteredProUpcoming].sort((a, b) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        
        setDateFilteredLiveMatches(allLiveMatches);
        setDateFilteredUpcomingMatches(allUpcomingMatches);
      } catch (error) {
        console.error('Error loading date-filtered matches:', error);
        setDateFilteredLiveMatches([]);
        setDateFilteredUpcomingMatches([]);
      } finally {
        setLoadingDateFiltered(false);
      }
    }
    
    loadDateFilteredMatches();
  }, [selectedDate, proLiveMatches, proUpcomingMatches]);

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
          {/* Unified Matches Section with Date Picker */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-gaming flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-blue-400" />
                <span className="highlight-gradient">Esports</span> Matches
                <div className="flex gap-2 ml-3">
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-400/30">
                    <Trophy size={12} className="mr-1" />
                    PRO
                  </Badge>
                  <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-400/30">
                    <Users size={12} className="mr-1" />
                    AMATEUR
                  </Badge>
                </div>
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
                <Loader2 className="h-8 w-8 animate-spin text-theme-purple mr-2" />
                <span>Loading matches for selected date...</span>
              </div>
            ) : (
              <>
                {/* Live Matches for Selected Date */}
                {dateFilteredLiveMatches.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-md font-semibold text-green-400 mb-4 flex items-center">
                      🔴 Live Now ({dateFilteredLiveMatches.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {dateFilteredLiveMatches.map(match => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Matches for Selected Date */}
                {dateFilteredUpcomingMatches.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-md font-semibold text-blue-400 mb-4 flex items-center">
                      📅 Upcoming ({dateFilteredUpcomingMatches.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {dateFilteredUpcomingMatches.map(match => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  </div>
                )}

                {/* No Matches State */}
                {dateFilteredLiveMatches.length === 0 && dateFilteredUpcomingMatches.length === 0 && (
                  <div className="text-center py-8 bg-theme-gray-dark/50 rounded-md">
                    <p className="text-gray-400 mb-4">No matches scheduled for {formatMatchDate(selectedDate)}.</p>
                    <p className="text-sm text-gray-500">
                      Try selecting a different date or clicking "Sync Live" / "Sync Upcoming" to refresh match data.
                    </p>
                  </div>
                )}
              </>
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
