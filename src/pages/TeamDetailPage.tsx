
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
        
        console.log('TeamDetailPage: Fetching team data for ID:', teamId);
        
        // Fetch team details
        const team = await fetchTeamById(teamId);
        console.log('TeamDetailPage: Received team data:', team);
        
        // Fetch team players
        let players: any[] = [];
        try {
          players = await fetchPlayersByTeamId(teamId);
          console.log('TeamDetailPage: Received players data:', players);
        } catch (error) {
          console.error('Error fetching team players:', error);
        }
        
        // Combine data
        const combinedData = {
          ...team,
          id: team.id || teamId, // Ensure ID is available
          hash_image: team.hash_image || null,
          players: players.map(player => ({
            id: player.id,
            name: player.name,
            image_url: player.image_url,
            hash_image: player.hash_image || null,
            role: player.role,
            country: player.country
          }))
        };
        
        console.log('TeamDetailPage: Combined team data:', combinedData);
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
      hash_image: null,
      country: 'International',
      region: 'Global',
      acronym: 'TS',
      players: [
        { id: '101', name: 'Player One', image_url: '/placeholder.svg', hash_image: null, role: 'Captain', country: 'United States' },
        { id: '102', name: 'Player Two', image_url: '/placeholder.svg', hash_image: null, role: 'Support', country: 'Canada' },
        { id: '103', name: 'Player Three', image_url: '/placeholder.svg', hash_image: null, role: 'Entry Fragger', country: 'Sweden' },
        { id: '104', name: 'Player Four', image_url: '/placeholder.svg', hash_image: null, role: 'AWPer', country: 'Denmark' },
        { id: '105', name: 'Player Five', image_url: '/placeholder.svg', hash_image: null, role: 'Rifler', country: 'France' }
      ],
      matches: [
        { 
          id: '201', 
          name: 'Team Sample vs Team Rival', 
          start_time: new Date(Date.now() + 86400000).toISOString(), // tomorrow 
          opponent: 'Team Rival',
          opponent_image: '/placeholder.svg',
          opponent_hash_image: null,
          opponent_id: '301'
        },
        { 
          id: '202', 
          name: 'Team Elite vs Team Sample', 
          start_time: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
          opponent: 'Team Elite',
          opponent_image: '/placeholder.svg',
          opponent_hash_image: null,
          opponent_id: '302'
        }
      ]
    };
    
    console.log('TeamDetailPage: Generated sample team data:', sampleTeam);
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
