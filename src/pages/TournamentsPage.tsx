
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { fetchTournaments } from '@/lib/sportDevsApi';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Trophy, Map } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Tournament {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  prize_pool?: string;
  image_url?: string;
  location?: string;
  game?: string;
}

const TournamentsPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    async function loadTournaments() {
      try {
        setLoading(true);
        const data = await fetchTournaments(20);
        setTournaments(data);
      } catch (error) {
        console.error('Error loading tournaments:', error);
        toast({
          title: "Error loading tournaments",
          description: "Could not fetch tournament data. Using sample tournaments instead.",
          variant: "destructive",
        });
        
        // Generate sample tournaments data
        generateSampleTournaments();
      } finally {
        setLoading(false);
      }
    }
    
    loadTournaments();
  }, [toast]);
  
  const generateSampleTournaments = () => {
    const esportsGames = ['CS:GO', 'League of Legends', 'Dota 2', 'Valorant'];
    const locations = ['Online', 'Stockholm, Sweden', 'Cologne, Germany', 'Las Vegas, USA', 'Seoul, South Korea'];
    const organizers = ['ESL', 'BLAST', 'PGL', 'Dreamhack', 'Riot Games', 'Valve'];
    
    const sampleTournaments: Tournament[] = [];
    
    for (let i = 1; i <= 12; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (i % 3) * 10);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      
      const game = esportsGames[i % esportsGames.length];
      const organizer = organizers[i % organizers.length];
      const tournamentName = `${organizer} ${game} ${organizer === 'Valve' ? 'Major' : 'Pro Tour'} ${new Date().getFullYear()}`;
      
      sampleTournaments.push({
        id: `tournament-${i}`,
        name: tournamentName,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        prize_pool: `$${(100 + i * 50).toLocaleString()},000`,
        image_url: '/placeholder.svg',
        location: locations[i % locations.length],
        game: game
      });
    }
    
    setTournaments(sampleTournaments);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-theme-purple mr-2" />
          <span className="text-xl">Loading tournaments...</span>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">
          <span className="highlight-gradient">Esports</span> Tournaments
        </h1>
        
        <div className="mb-8">
          <p className="text-gray-300">
            Browse upcoming and ongoing esports tournaments, view brackets, standings, and match schedules.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map(tournament => (
            <Card key={tournament.id} className="bg-theme-gray-dark border-theme-gray-medium hover:border-theme-purple transition-colors">
              <CardContent className="p-0">
                <div className="relative">
                  <div className="h-32 bg-gradient-to-r from-theme-gray-medium to-theme-gray-dark flex items-center justify-center p-4">
                    <img 
                      src={tournament.image_url || '/placeholder.svg'} 
                      alt={tournament.name} 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  {tournament.game && (
                    <Badge className="absolute top-3 right-3 bg-theme-purple">
                      {tournament.game}
                    </Badge>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="text-xl font-bold line-clamp-2 min-h-[3.5rem]">{tournament.name}</h3>
                  
                  <div className="flex items-center text-gray-400 mt-2">
                    <Calendar size={14} className="mr-2" />
                    <span className="text-sm">
                      {tournament.start_date && tournament.end_date 
                        ? `${new Date(tournament.start_date).toLocaleDateString()} - ${new Date(tournament.end_date).toLocaleDateString()}`
                        : "Dates not available"}
                    </span>
                  </div>
                  
                  {tournament.location && (
                    <div className="flex items-center text-gray-400 mt-1.5">
                      <Map size={14} className="mr-2" />
                      <span className="text-sm line-clamp-1">{tournament.location}</span>
                    </div>
                  )}
                  
                  {tournament.prize_pool && (
                    <div className="flex items-center text-gray-400 mt-1.5">
                      <Trophy size={14} className="mr-2" />
                      <span className="text-sm">{tournament.prize_pool}</span>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <Button asChild variant="ghost" className="w-full border border-theme-purple/30 text-theme-purple hover:bg-theme-purple/10">
                      <Link to={`/tournament/${tournament.id}`}>
                        View Tournament
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TournamentsPage;
