
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import PlayerProfile from '@/components/PlayerProfile';
import { fetchPlayerById } from '@/lib/sportDevsApi';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const PlayerDetailPage: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const [playerData, setPlayerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    async function loadPlayerData() {
      try {
        setLoading(true);
        
        if (!playerId) {
          throw new Error('Player ID is required');
        }
        
        // Fetch player details
        const player = await fetchPlayerById(playerId);
        setPlayerData(player);
      } catch (error) {
        console.error('Error loading player data:', error);
        toast({
          title: "Error loading player data",
          description: "Could not fetch player information. Please try again later.",
          variant: "destructive",
        });
        
        // Generate sample player data
        generateSamplePlayerData();
      } finally {
        setLoading(false);
      }
    }
    
    loadPlayerData();
  }, [playerId, toast]);
  
  const generateSamplePlayerData = () => {
    const samplePlayer = {
      id: playerId || '1',
      name: 's1mple',
      first_name: 'Oleksandr',
      last_name: 'Kostyliev',
      image_url: '/placeholder.svg',
      role: 'AWPer',
      country: 'Ukraine',
      team: {
        id: '101',
        name: 'Natus Vincere',
        image_url: '/placeholder.svg'
      },
      statistics: {
        rating: '1.32',
        kills_per_round: '0.85',
        headshot_percentage: '38.7',
        maps_played: 210
      }
    };
    
    setPlayerData(samplePlayer);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-theme-purple mr-2" />
          <span className="text-xl">Loading player data...</span>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        {playerData ? (
          <PlayerProfile player={playerData} />
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-gray-400">Player not found.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default PlayerDetailPage;
