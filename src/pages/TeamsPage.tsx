
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { searchTeams } from '@/lib/sportDevsApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Trophy, Calendar, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import EsportsNavigation from '@/components/EsportsNavigation';

interface Team {
  id: string;
  name: string;
  image_url: string | null;
  country?: string;
  acronym?: string;
}

const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEsport, setActiveEsport] = useState('csgo');
  const { toast } = useToast();
  
  useEffect(() => {
    async function loadTeams() {
      try {
        // In a real app, we'd fetch teams specific to the selected esport
        // For now, we'll use the search API with common team names
        const commonTeams = ['Navi', 'Liquid', 'Fnatic', 'Cloud9', 'G2', 'Vitality'];
        
        // Use a random team name to get some results
        const searchTerm = commonTeams[Math.floor(Math.random() * commonTeams.length)];
        const teamsData = await searchTeams(searchTerm, 50);
        
        setTeams(teamsData);
        setFilteredTeams(teamsData);
      } catch (error) {
        console.error('Error loading teams:', error);
        toast({
          title: "Error loading teams",
          description: "Could not fetch team data. Please try again later.",
          variant: "destructive",
        });
        
        // Generate sample teams if API fails
        generateSampleTeams();
      } finally {
        setLoading(false);
      }
    }
    
    loadTeams();
  }, [activeEsport, toast]);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTeams(teams);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = teams.filter(team => 
      team.name.toLowerCase().includes(query) || 
      (team.acronym && team.acronym.toLowerCase().includes(query))
    );
    
    setFilteredTeams(filtered);
  }, [searchQuery, teams]);
  
  const generateSampleTeams = () => {
    const sampleTeams: Team[] = [
      { id: '1', name: 'Natus Vincere', image_url: '/placeholder.svg', acronym: 'NAVI', country: 'Ukraine' },
      { id: '2', name: 'Team Liquid', image_url: '/placeholder.svg', acronym: 'TL', country: 'United States' },
      { id: '3', name: 'Fnatic', image_url: '/placeholder.svg', acronym: 'FNC', country: 'United Kingdom' },
      { id: '4', name: 'G2 Esports', image_url: '/placeholder.svg', acronym: 'G2', country: 'Germany' },
      { id: '5', name: 'Vitality', image_url: '/placeholder.svg', acronym: 'VIT', country: 'France' },
      { id: '6', name: 'Cloud9', image_url: '/placeholder.svg', acronym: 'C9', country: 'United States' },
      { id: '7', name: 'Astralis', image_url: '/placeholder.svg', acronym: 'AST', country: 'Denmark' },
      { id: '8', name: 'FaZe Clan', image_url: '/placeholder.svg', acronym: 'FaZe', country: 'International' },
      { id: '9', name: 'Team Secret', image_url: '/placeholder.svg', acronym: 'Secret', country: 'Europe' },
      { id: '10', name: 'Evil Geniuses', image_url: '/placeholder.svg', acronym: 'EG', country: 'United States' },
      { id: '11', name: 'T1', image_url: '/placeholder.svg', acronym: 'T1', country: 'South Korea' },
      { id: '12', name: 'Team Spirit', image_url: '/placeholder.svg', acronym: 'Spirit', country: 'Russia' }
    ];
    
    setTeams(sampleTeams);
    setFilteredTeams(sampleTeams);
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
          <span className="text-xl">Loading teams...</span>
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
          <span className="highlight-gradient">Esports</span> Teams
        </h1>
        <p className="text-gray-400 mb-6">
          Browse professional teams across various esports titles
        </p>
        
        <div className="mb-8">
          <EsportsNavigation activeEsport={activeEsport} />
        </div>
        
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-theme-gray-dark border border-theme-gray-medium"
            />
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        
        {filteredTeams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTeams.map((team) => (
              <Link to={`/team/${team.id}`} key={team.id}>
                <Card className="bg-theme-gray-dark border border-theme-gray-medium hover:border-theme-purple transition-all h-full">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="bg-theme-gray-medium rounded-full p-2 mb-4">
                        <img 
                          src={team.image_url || '/placeholder.svg'} 
                          alt={team.name} 
                          className="w-24 h-24 object-contain"
                        />
                      </div>
                      
                      <h3 className="font-bold text-lg mb-1">{team.name}</h3>
                      
                      <div className="flex items-center gap-2 mb-4">
                        {team.acronym && (
                          <Badge variant="outline" className="font-normal">
                            {team.acronym}
                          </Badge>
                        )}
                        {team.country && (
                          <Badge variant="outline" className="font-normal">
                            {team.country}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 w-full text-center mt-2">
                        <div className="flex flex-col items-center text-gray-400">
                          <Trophy size={18} className="mb-1" />
                          <span className="text-xs">5 Titles</span>
                        </div>
                        <div className="flex flex-col items-center text-gray-400">
                          <Users size={18} className="mb-1" />
                          <span className="text-xs">7 Players</span>
                        </div>
                        <div className="flex flex-col items-center text-gray-400">
                          <Calendar size={18} className="mb-1" />
                          <span className="text-xs">2018</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-gray-400">No teams found matching your search.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TeamsPage;
