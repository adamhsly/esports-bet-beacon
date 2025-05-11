
import React, { useEffect, useState } from 'react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { MatchCard } from '@/components/MatchCard';
import { fetchLiveMatches, fetchUpcomingMatches, MatchInfo } from '@/lib/sportDevsApi';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import EsportsNavigation from '@/components/EsportsNavigation';

const Index: React.FC = () => {
  const [liveMatches, setLiveMatches] = useState<MatchInfo[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEsport, setActiveEsport] = useState('csgo');
  const { toast } = useToast();
  
  useEffect(() => {
    async function loadMatches() {
      try {
        setLoading(true);
        
        // Fetch live and upcoming matches in parallel
        const [live, upcoming] = await Promise.all([
          fetchLiveMatches(activeEsport),
          fetchUpcomingMatches(activeEsport)
        ]);
        
        // Ensure returned match objects have exactly two teams
        const processMatches = (matches: MatchInfo[]): MatchInfo[] => {
          return matches.map(match => ({
            ...match,
            teams: match.teams.length >= 2 
              ? [match.teams[0], match.teams[1]] 
              : [
                  match.teams[0] || { name: 'TBD', logo: '/placeholder.svg' },
                  match.teams[1] || { name: 'TBD', logo: '/placeholder.svg' }
                ]
          }));
        };
        
        setLiveMatches(processMatches(live));
        setUpcomingMatches(processMatches(upcoming));
      } catch (error) {
        console.error('Error loading matches:', error);
        toast({
          title: "Error loading matches",
          description: "Could not fetch match data. Please try again later.",
          variant: "destructive",
        });
        
        // Generate sample match data
        generateSampleMatches();
      } finally {
        setLoading(false);
      }
    }
    
    loadMatches();
  }, [activeEsport, toast]);
  
  const generateSampleMatches = () => {
    const sampleLiveMatches: MatchInfo[] = [
      {
        id: 'live-1',
        teams: [
          { name: 'Team A', logo: '/placeholder.svg' },
          { name: 'Team B', logo: '/placeholder.svg' }
        ],
        startTime: new Date().toISOString(),
        tournament: 'Sample Tournament',
        esportType: 'csgo',
        bestOf: 3
      },
      {
        id: 'live-2',
        teams: [
          { name: 'Team C', logo: '/placeholder.svg' },
          { name: 'Team D', logo: '/placeholder.svg' }
        ],
        startTime: new Date().toISOString(),
        tournament: 'Another Tournament',
        esportType: 'lol',
        bestOf: 5
      }
    ];
    
    const sampleUpcomingMatches: MatchInfo[] = [
      {
        id: 'upcoming-1',
        teams: [
          { name: 'Team E', logo: '/placeholder.svg' },
          { name: 'Team F', logo: '/placeholder.svg' }
        ],
        startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        tournament: 'Future Tournament',
        esportType: 'dota2',
        bestOf: 3
      },
      {
        id: 'upcoming-2',
        teams: [
          { name: 'Team G', logo: '/placeholder.svg' },
          { name: 'Team H', logo: '/placeholder.svg' }
        ],
        startTime: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        tournament: 'Yet Another Tournament',
        esportType: 'valorant',
        bestOf: 1
      }
    ];
    
    setLiveMatches(sampleLiveMatches);
    setUpcomingMatches(sampleUpcomingMatches);
  };
  
  const handleEsportChange = (esportId: string) => {
    setActiveEsport(esportId);
    setLoading(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-theme-purple mr-2" />
          <span className="text-xl">Loading matches...</span>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold font-gaming mb-2">
          <span className="highlight-gradient">Live</span> Esports Matches
        </h1>
        <p className="text-gray-400 mb-6">
          Watch live matches and stay updated with the latest esports action
        </p>
        
        <div className="mb-8">
          <EsportsNavigation 
            activeEsport={activeEsport} 
            onEsportChange={handleEsportChange} 
          />
        </div>
        
        <h2 className="text-xl font-bold mb-4">Live Matches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {liveMatches.length > 0 ? (
            liveMatches.map((match) => (
              <MatchCard key={match.id} match={match as any} />
            ))
          ) : (
            <div className="text-center py-20 col-span-full">
              <p className="text-xl text-gray-400">No live matches available at the moment.</p>
            </div>
          )}
        </div>
        
        <h2 className="text-xl font-bold mt-8 mb-4">Upcoming Matches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingMatches.length > 0 ? (
            upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match as any} />
            ))
          ) : (
            <div className="text-center py-20 col-span-full">
              <p className="text-xl text-gray-400">No upcoming matches scheduled.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Index;
