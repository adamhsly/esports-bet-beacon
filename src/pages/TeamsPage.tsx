
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { searchTeams } from '@/lib/sportDevsApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, List, Grid2X2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import EsportsNavigation from '@/components/EsportsNavigation';
import { getTeamImageUrl, getEnhancedTeamLogoUrl } from '@/utils/cacheUtils';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ButtonGroup } from '@/components/ui/button-group';

interface Team {
  id: string;
  name: string;
  image_url: string | null;
  hash_image?: string | null;
  country?: string;
  acronym?: string;
}

const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEsport, setActiveEsport] = useState('csgo');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const { toast } = useToast();
  
  useEffect(() => {
    async function loadTeams() {
      try {
        // In a real app, we'd fetch teams specific to the selected esport
        // For now, we'll use the search API with common team names
        const commonTeams = ['Navi', 'Liquid', 'Fnatic', 'Cloud9', 'G2', 'Vitality'];
        
        // Use a random team name to get some results
        const searchTerm = commonTeams[Math.floor(Math.random() * commonTeams.length)];
        console.log('TeamsPage: Searching teams with term:', searchTerm);
        const teamsData = await searchTeams(searchTerm, 50);
        console.log('TeamsPage: Received teams data:', teamsData);
        
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
      { id: '1', name: 'Natus Vincere', image_url: '/placeholder.svg', hash_image: null, acronym: 'NAVI', country: 'Ukraine' },
      { id: '2', name: 'Team Liquid', image_url: '/placeholder.svg', hash_image: null, acronym: 'TL', country: 'United States' },
      { id: '3', name: 'Fnatic', image_url: '/placeholder.svg', hash_image: null, acronym: 'FNC', country: 'United Kingdom' },
      { id: '4', name: 'G2 Esports', image_url: '/placeholder.svg', hash_image: null, acronym: 'G2', country: 'Germany' },
      { id: '5', name: 'Vitality', image_url: '/placeholder.svg', hash_image: null, acronym: 'VIT', country: 'France' },
      { id: '6', name: 'Cloud9', image_url: '/placeholder.svg', hash_image: null, acronym: 'C9', country: 'United States' },
      { id: '7', name: 'Astralis', image_url: '/placeholder.svg', hash_image: null, acronym: 'AST', country: 'Denmark' },
      { id: '8', name: 'FaZe Clan', image_url: '/placeholder.svg', hash_image: null, acronym: 'FaZe', country: 'International' },
      { id: '9', name: 'Team Secret', image_url: '/placeholder.svg', hash_image: null, acronym: 'Secret', country: 'Europe' },
      { id: '10', name: 'Evil Geniuses', image_url: '/placeholder.svg', hash_image: null, acronym: 'EG', country: 'United States' },
      { id: '11', name: 'T1', image_url: '/placeholder.svg', hash_image: null, acronym: 'T1', country: 'South Korea' },
      { id: '12', name: 'Team Spirit', image_url: '/placeholder.svg', hash_image: null, acronym: 'Spirit', country: 'Russia' }
    ];
    
    console.log('TeamsPage: Generated sample teams:', sampleTeams);
    setTeams(sampleTeams);
    setFilteredTeams(sampleTeams);
  };
  
  const handleEsportChange = (esportId: string) => {
    setActiveEsport(esportId);
    setLoading(true);
  };
  
  // Get team image from cache or use fallback
  const getTeamImage = (team: Team): string => {
    const enhancedLogoUrl = getEnhancedTeamLogoUrl({
      id: team.id,
      name: team.name,
    });
    
    if (enhancedLogoUrl) {
      return enhancedLogoUrl;
    }
    
    if (team.id && team.hash_image) {
      return getTeamImageUrl(team.id, team.hash_image);
    }
    
    return team.image_url || '/placeholder.svg';
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

  const renderTeamsTable = () => (
    <Table className="mt-6">
      <TableCaption>List of professional {activeEsport.toUpperCase()} teams</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Logo</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Tag</TableHead>
          <TableHead>Country</TableHead>
          <TableHead className="text-center">Ranking</TableHead>
          <TableHead className="text-center">Win Rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredTeams.length > 0 ? (
          filteredTeams.map((team) => (
            <TableRow key={team.id} className="hover:bg-theme-gray-medium/50">
              <TableCell>
                <Link to={`/team/${team.id}`}>
                  <div className="bg-theme-gray-medium rounded-full p-1 w-12 h-12 flex items-center justify-center">
                    <img 
                      src={getTeamImage(team)} 
                      alt={team.name} 
                      className="max-w-10 max-h-10 object-contain"
                      onError={(e) => {
                        console.log('Team table image failed to load:', team.name);
                        (e.target as HTMLImageElement).onerror = null;
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  </div>
                </Link>
              </TableCell>
              <TableCell className="font-medium">
                <Link to={`/team/${team.id}`} className="hover:text-theme-purple">
                  {team.name}
                </Link>
              </TableCell>
              <TableCell>
                {team.acronym ? (
                  <Badge variant="outline">{team.acronym}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                {team.country ? (
                  <span>{team.country}</span>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <Badge className="bg-theme-purple">#{Math.floor(Math.random() * 20) + 1}</Badge>
              </TableCell>
              <TableCell className="text-center">
                {`${Math.floor(Math.random() * 40) + 50}%`}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-4">
              No teams found matching your search.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const renderTeamsGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
      {filteredTeams.map((team) => (
        <Link to={`/team/${team.id}`} key={team.id}>
          <Card className="bg-theme-gray-dark border border-theme-gray-medium hover:border-theme-purple transition-all h-full">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="bg-theme-gray-medium rounded-full p-2 mb-4">
                  <img 
                    src={getTeamImage(team)} 
                    alt={team.name} 
                    className="w-24 h-24 object-contain"
                    onError={(e) => {
                      console.log('Team card image failed to load:', team.name);
                      (e.target as HTMLImageElement).onerror = null;
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
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
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );

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
        
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
          <div className="relative max-w-md w-full">
            <Input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-theme-gray-dark border border-theme-gray-medium"
            />
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('table')}
              className="bg-theme-gray-dark border border-theme-gray-medium hover:bg-theme-gray-medium"
            >
              <List size={20} />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="bg-theme-gray-dark border border-theme-gray-medium hover:bg-theme-gray-medium"
            >
              <Grid2X2 size={20} />
            </Button>
          </div>
        </div>
        
        {filteredTeams.length === 0 && !loading ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-400">No teams found matching your search.</p>
          </div>
        ) : viewMode === 'table' ? renderTeamsTable() : renderTeamsGrid()}
      </div>
      <Footer />
    </div>
  );
};

export default TeamsPage;
