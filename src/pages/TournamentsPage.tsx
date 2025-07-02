
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { fetchUnifiedTournaments, UnifiedTournament, formatPrizePool } from '@/lib/tournamentService';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Trophy, Map, Users, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TournamentsPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<UnifiedTournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<UnifiedTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { toast } = useToast();
  
  useEffect(() => {
    async function loadTournaments() {
      try {
        setLoading(true);
        const data = await fetchUnifiedTournaments();
        setTournaments(data);
        setFilteredTournaments(data);
      } catch (error) {
        console.error('Error loading tournaments:', error);
        toast({
          title: "Error loading tournaments",
          description: "Could not fetch tournament data. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadTournaments();
  }, [toast]);

  useEffect(() => {
    let filtered = tournaments;

    if (gameFilter !== 'all') {
      filtered = filtered.filter(t => t.esportType === gameFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    setFilteredTournaments(filtered);
  }, [tournaments, gameFilter, statusFilter, typeFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-400/30';
      case 'upcoming': return 'bg-blue-500/20 text-blue-400 border-blue-400/30';
      case 'finished': return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
      default: return 'bg-theme-purple/20 text-theme-purple border-theme-purple/30';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'pandascore': return 'bg-blue-500/20 text-blue-400 border-blue-400/30';
      case 'faceit': return 'bg-orange-500/20 text-orange-400 border-orange-400/30';
      case 'sportdevs': return 'bg-purple-500/20 text-purple-400 border-purple-400/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
    }
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
          <span className="highlight-gradient">Esports</span> Tournaments & Leagues
        </h1>
        
        <div className="mb-8">
          <p className="text-gray-300 mb-6">
            Discover tournaments across all major esports titles. Track live events, upcoming competitions, and completed championships with detailed standings and match schedules.
          </p>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={gameFilter} onValueChange={setGameFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Game" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Games</SelectItem>
                <SelectItem value="cs2">CS:GO / CS2</SelectItem>
                <SelectItem value="lol">League of Legends</SelectItem>
                <SelectItem value="dota2">Dota 2</SelectItem>
                <SelectItem value="valorant">Valorant</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="finished">Finished</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="tournament">Tournaments</SelectItem>
                <SelectItem value="league">Leagues</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Tournament Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-theme-gray-dark border-theme-gray-medium p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-theme-purple">{filteredTournaments.length}</div>
              <div className="text-sm text-gray-400">Total Events</div>
            </div>
          </Card>
          <Card className="bg-theme-gray-dark border-theme-gray-medium p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{filteredTournaments.filter(t => t.status === 'active').length}</div>
              <div className="text-sm text-gray-400">Live Now</div>
            </div>
          </Card>
          <Card className="bg-theme-gray-dark border-theme-gray-medium p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{filteredTournaments.filter(t => t.status === 'upcoming').length}</div>
              <div className="text-sm text-gray-400">Upcoming</div>
            </div>
          </Card>
          <Card className="bg-theme-gray-dark border-theme-gray-medium p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{[...new Set(filteredTournaments.map(t => t.esportType))].length}</div>
              <div className="text-sm text-gray-400">Game Titles</div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map(tournament => (
            <Card key={tournament.id} className="bg-theme-gray-dark border-theme-gray-medium hover:border-theme-purple transition-colors group">
              <CardContent className="p-0">
                <div className="relative overflow-hidden">
                  <div className="h-32 bg-gradient-to-r from-theme-gray-medium to-theme-gray-dark flex items-center justify-center p-4 group-hover:scale-105 transition-transform duration-300">
                    <img 
                      src={tournament.imageUrl || '/placeholder.svg'} 
                      alt={tournament.name} 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="absolute top-3 right-3 flex gap-1 flex-col">
                    <Badge className={`${getStatusColor(tournament.status)} text-xs`}>
                      {tournament.status === 'active' ? 'LIVE' : tournament.status.toUpperCase()}
                    </Badge>
                    <Badge className={`${getSourceColor(tournament.source)} text-xs`}>
                      {tournament.source.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-theme-purple text-xs">
                      {tournament.esportType.toUpperCase()}
                    </Badge>
                  </div>
                  {tournament.status === 'active' && (
                    <div className="absolute bottom-2 left-2">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-white bg-red-500/80 px-2 py-1 rounded">LIVE</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-lg font-bold line-clamp-2 flex-1 group-hover:text-theme-purple transition-colors">{tournament.name}</h3>
                    <div className="flex-shrink-0">
                      {tournament.type === 'league' ? (
                        <Users className="h-4 w-4 text-blue-400" />
                      ) : (
                        <Trophy className="h-4 w-4 text-yellow-400" />
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {tournament.startDate && tournament.endDate && (
                      <div className="flex items-center text-gray-400">
                        <Calendar size={14} className="mr-2 flex-shrink-0" />
                        <span className="text-sm">
                          {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      {tournament.prizePool && (
                        <div className="flex items-center text-green-400">
                          <Trophy size={14} className="mr-2" />
                          <span className="text-sm font-medium">{formatPrizePool(tournament.prizePool)}</span>
                        </div>
                      )}

                      {tournament.tier && (
                        <div className="flex items-center text-gray-400">
                          <Map size={14} className="mr-1" />
                          <span className="text-xs capitalize">{tournament.tier}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Button asChild variant="ghost" className="w-full border border-theme-purple/30 text-theme-purple hover:bg-theme-purple/10 hover:border-theme-purple group-hover:bg-theme-purple/5">
                      <Link to={`/tournament/${tournament.id}`}>
                        {tournament.status === 'active' ? 'Watch Live' : `View ${tournament.type === 'league' ? 'League' : 'Tournament'}`}
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTournaments.length === 0 && (
          <div className="text-center py-16 bg-theme-gray-dark/50 rounded-lg border-2 border-dashed border-theme-gray-medium">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No tournaments found</h3>
            <p className="text-gray-400 mb-4">Try adjusting your filters to see more results.</p>
            <Button variant="outline" onClick={() => {
              setGameFilter('all');
              setStatusFilter('all');
              setTypeFilter('all');
            }}>
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TournamentsPage;
