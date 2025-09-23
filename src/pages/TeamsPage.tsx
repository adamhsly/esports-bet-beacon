import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { aggregateTeams, generateSampleTeams, type AggregatedTeam } from '@/lib/teamsAggregation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, List, Grid2X2, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import EsportsNavigation from '@/components/EsportsNavigation';
import { getTeamImageUrl } from '@/utils/cacheUtils';
import { getEnhancedTeamLogoUrl } from '@/utils/teamLogoUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Use the AggregatedTeam type from teamsAggregation
type Team = AggregatedTeam;

const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEsport, setActiveEsport] = useState('csgo');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();
  
  useEffect(() => {
    async function loadTeams() {
      try {
        console.log('TeamsPage: Loading teams for esport:', activeEsport);
        const teamsData = await aggregateTeams(activeEsport === 'all' ? undefined : activeEsport);
        console.log('TeamsPage: Received aggregated teams:', teamsData);
        
        // Sort teams by recent match count initially
        const sortedTeams = sortTeamsByRank(teamsData, 'desc');
        
        setTeams(sortedTeams);
        setFilteredTeams(sortedTeams);
      } catch (error) {
        console.error('Error loading teams:', error);
        toast({
          title: "Error loading teams",
          description: "Could not fetch team data from Pandascore/Faceit. Using sample data.",
          variant: "destructive",
        });
        
        // Generate sample teams if API fails
        const sampleTeams = generateSampleTeams();
        setTeams(sampleTeams);
        setFilteredTeams(sampleTeams);
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
  
  const sortTeamsByRank = (teamsToSort: Team[], direction: 'asc' | 'desc'): Team[] => {
    return [...teamsToSort].sort((a, b) => {
      // Sort by recent matches count first, then by rank
      if (direction === 'desc') {
        if (b.recent_matches_count !== a.recent_matches_count) {
          return b.recent_matches_count - a.recent_matches_count;
        }
        const rankA = a.rank || 999;
        const rankB = b.rank || 999;
        return rankA - rankB;
      } else {
        const rankA = a.rank || 999;
        const rankB = b.rank || 999;
        return rankA - rankB;
      }
    });
  };

  const handleSortDirectionChange = () => {
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newDirection);
    setFilteredTeams(sortTeamsByRank(filteredTeams, newDirection));
  };
  
  // This function is no longer needed as we use generateSampleTeams from teamsAggregation
  
  const handleEsportChange = (esportId: string) => {
    setActiveEsport(esportId);
    setLoading(true);
  };
  
  // Get team image with enhanced handling
  const getTeamImage = (team: Team): string => {
    // Use our enhanced utility function with all possible image sources
    return getEnhancedTeamLogoUrl({
      name: team.name,
      image_url: team.image_url,
      hash_image: team.hash_image
    });
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
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
          <TableHead>Country</TableHead>
          <TableHead className="text-center">
            <div className="flex items-center justify-center">
              <span className="mr-2">Activity</span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSortDirectionChange}
                className="h-6 w-6"
              >
                {sortDirection === 'asc' ? (
                  <ArrowUpAZ className="h-4 w-4" />
                ) : (
                  <ArrowDownAZ className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TableHead>
          <TableHead className="text-center">Source</TableHead>
          <TableHead className="text-center">Recent Matches</TableHead>
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
                <Link to={`/team/${team.id}`} className="hover:text-theme-purple text-white">
                  {team.name}
                </Link>
              </TableCell>
              <TableCell>
                {team.country ? (
                  <span>{team.country}</span>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <Badge className="bg-theme-purple">#{team.rank || '-'}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={team.source === 'pandascore' ? 'default' : 'secondary'}>
                  {team.source === 'pandascore' ? 'Pro' : 'Amateur'}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <span className="font-medium text-white">{team.recent_matches_count}</span>
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
                
                <h3 className="font-bold text-lg mb-1 text-white">{team.name}</h3>
                
                <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                  {team.country && (
                    <Badge variant="outline" className="font-normal">
                      {team.country}
                    </Badge>
                  )}
                </div>
                
                <div className="mt-2 flex flex-col gap-2 items-center">
                  <div className="flex gap-2 items-center">
                    <Badge className="bg-theme-purple">
                      Rank #{team.rank || '-'}
                    </Badge>
                    <Badge variant={team.source === 'pandascore' ? 'default' : 'secondary'}>
                      {team.source === 'pandascore' ? 'Pro' : 'Amateur'}
                    </Badge>
                  </div>
                  <span className="text-sm text-white">
                    {team.recent_matches_count} recent matches
                  </span>
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
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8">
          <EsportsNavigation 
            activeEsport={activeEsport}
            onEsportChange={handleEsportChange}
          />
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
          
          <div className="flex gap-2 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-theme-gray-dark border border-theme-gray-medium hover:bg-theme-gray-medium"
                >
                  <ArrowUpAZ className="h-4 w-4 mr-2" />
                  Sort by Activity
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setSortDirection('asc');
                  setFilteredTeams(sortTeamsByRank(filteredTeams, 'asc'));
                }}>
                  By Rank (Low to High)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setSortDirection('desc');
                  setFilteredTeams(sortTeamsByRank(filteredTeams, 'desc'));
                }}>
                  By Activity (Most Active)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
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
