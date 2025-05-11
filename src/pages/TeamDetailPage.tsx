
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import TeamProfile from '@/components/TeamProfile';
import { fetchTeamById, fetchPlayersByTeamId } from '@/lib/sportDevsApi';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const TeamDetailPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [teamData, setTeamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    async function loadTeamData() {
      try {
        setLoading(true);
        
        if (!teamId) {
          throw new Error('Team ID is required');
        }
        
        // Fetch team details
        const team = await fetchTeamById(teamId);
        
        // Fetch team players
        let players: any[] = [];
        try {
          players = await fetchPlayersByTeamId(teamId);
        } catch (error) {
          console.error('Error fetching team players:', error);
        }
        
        // Combine data
        const combinedData = {
          ...team,
          players: players.map(player => ({
            id: player.id,
            name: player.name,
            image_url: player.image_url,
            role: player.role,
            country: player.country
          }))
        };
        
        setTeamData(combinedData);
      } catch (error) {
        console.error('Error loading team data:', error);
        toast({
          title: "Error loading team data",
          description: "Could not fetch team information. Please try again later.",
          variant: "destructive",
        });
        
        // Generate sample team data
        generateSampleTeamData();
      } finally {
        setLoading(false);
      }
    }
    
    loadTeamData();
  }, [teamId, toast]);
  
  const generateSampleTeamData = () => {
    const sampleTeam = {
      id: teamId || '1',
      name: 'Team Sample',
      image_url: '/placeholder.svg',
      country: 'International',
      region: 'Global',
      acronym: 'TS',
      players: [
        { id: '101', name: 'Player One', image_url: '/placeholder.svg', role: 'Captain', country: 'United States' },
        { id: '102', name: 'Player Two', image_url: '/placeholder.svg', role: 'Support', country: 'Canada' },
        { id: '103', name: 'Player Three', image_url: '/placeholder.svg', role: 'Entry Fragger', country: 'Sweden' },
        { id: '104', name: 'Player Four', image_url: '/placeholder.svg', role: 'AWPer', country: 'Denmark' },
        { id: '105', name: 'Player Five', image_url: '/placeholder.svg', role: 'Rifler', country: 'France' }
      ],
      matches: [
        { 
          id: '201', 
          name: 'Team Sample vs Team Rival', 
          start_time: new Date(Date.now() + 86400000).toISOString(), // tomorrow 
          opponent: 'Team Rival',
          opponent_image: '/placeholder.svg'
        },
        { 
          id: '202', 
          name: 'Team Elite vs Team Sample', 
          start_time: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
          opponent: 'Team Elite',
          opponent_image: '/placeholder.svg'
        }
      ]
    };
    
    setTeamData(sampleTeam);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-theme-purple mr-2" />
          <span className="text-xl">Loading team data...</span>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        {teamData ? (
          <TeamProfile team={teamData} />
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-gray-400">Team not found.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TeamDetailPage;
