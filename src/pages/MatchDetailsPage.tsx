
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { OddsTable, Market, BookmakerOdds } from '@/components/OddsTable';
import Footer from '@/components/Footer';
import { getMatchById } from '@/lib/mockData';
import { ArrowLeft, Calendar, Trophy, Clock, Info, Star } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

const MatchDetailsPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [activeTab, setActiveTab] = useState('odds');
  
  // In a real application, you would fetch this data from an API
  const match = getMatchById(matchId || '');
  
  if (!match) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow container mx-auto px-4 py-12 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-4">Match not found</h1>
          <Link to="/esports/csgo" className="text-theme-purple hover:underline flex items-center">
            <ArrowLeft size={16} className="mr-1" /> Back to matches
          </Link>
        </div>
        <Footer />
      </div>
    );
  }
  
  // Sample markets data - in a real app this would come from your API
  const markets: Market[] = [
    { name: 'Match Winner', options: [match.teams[0].name, match.teams[1].name] },
    { name: 'Map 1 Winner', options: [match.teams[0].name, match.teams[1].name] },
    { name: 'Total Maps', options: ['Over 2.5', 'Under 2.5'] },
    { name: 'Map Handicap', options: [`${match.teams[0].name} -1.5`, `${match.teams[1].name} +1.5`] },
  ];
  
  // Sample bookmaker odds data - in a real app this would come from your API
  const bookmakerOdds: BookmakerOdds[] = [
    {
      bookmaker: 'BetMaster',
      logo: '/placeholder.svg',
      odds: { [match.teams[0].name]: '1.85', [match.teams[1].name]: '1.95', 'Over 2.5': '2.10', 'Under 2.5': '1.70', [`${match.teams[0].name} -1.5`]: '2.40', [`${match.teams[1].name} +1.5`]: '1.55' },
      link: '#',
    },
    {
      bookmaker: 'GG.bet',
      logo: '/placeholder.svg',
      odds: { [match.teams[0].name]: '1.90', [match.teams[1].name]: '1.90', 'Over 2.5': '2.05', 'Under 2.5': '1.75', [`${match.teams[0].name} -1.5`]: '2.35', [`${match.teams[1].name} +1.5`]: '1.60' },
      link: '#',
    },
    {
      bookmaker: 'Betway',
      logo: '/placeholder.svg',
      odds: { [match.teams[0].name]: '1.83', [match.teams[1].name]: '1.97', 'Over 2.5': '2.15', 'Under 2.5': '1.65', [`${match.teams[0].name} -1.5`]: '2.45', [`${match.teams[1].name} +1.5`]: '1.50' },
      link: '#',
    },
    {
      bookmaker: 'Unikrn',
      logo: '/placeholder.svg',
      odds: { [match.teams[0].name]: '1.87', [match.teams[1].name]: '1.93', 'Over 2.5': '2.08', 'Under 2.5': '1.72', [`${match.teams[0].name} -1.5`]: '2.38', [`${match.teams[1].name} +1.5`]: '1.57' },
      link: '#',
    },
  ];

  // Team statistics - in a real app these would come from your API
  const team1WinRate = 65; // percentage
  const team2WinRate = 58; // percentage
  
  // Recent encounters - in a real app these would come from your API
  const recentEncounters = [
    { date: '2023-10-15', winner: match.teams[0].name, score: '2-0' },
    { date: '2023-08-22', winner: match.teams[1].name, score: '2-1' },
    { date: '2023-06-10', winner: match.teams[0].name, score: '2-1' },
  ];

  // Tournament standings - in a real app these would come from your API
  const tournamentStandings = [
    { position: 1, team: 'Vitality', matches: 10, wins: 8, losses: 2, points: 24 },
    { position: 2, team: match.teams[0].name, matches: 10, wins: 7, losses: 3, points: 21 },
    { position: 3, team: 'Natus Vincere', matches: 10, wins: 6, losses: 4, points: 18 },
    { position: 4, team: match.teams[1].name, matches: 10, wins: 5, losses: 5, points: 15 },
    { position: 5, team: 'G2 Esports', matches: 10, wins: 4, losses: 6, points: 12 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to={`/esports/${match.esportType}`} className="text-theme-purple hover:underline flex items-center">
            <ArrowLeft size={16} className="mr-1" /> Back to {match.esportType.toUpperCase()} matches
          </Link>
        </div>
        
        {/* Tournament and Match Info Bar */}
        <div className="bg-theme-gray-medium bg-opacity-30 rounded-md p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy size={16} className="text-theme-purple" />
            <span className="font-medium">{match.tournament}</span>
          </div>
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-theme-purple" />
            <span>{new Date(match.startTime).toLocaleDateString('en-US', { 
              month: 'long', day: 'numeric', year: 'numeric' 
            })}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-theme-purple" />
            <span>{new Date(match.startTime).toLocaleTimeString('en-US', { 
              hour: '2-digit', minute: '2-digit' 
            })}</span>
          </div>
          <div className="flex items-center gap-3">
            <Info size={16} className="text-theme-purple" />
            <span>Best of {match.bestOf}</span>
          </div>
        </div>
        
        {/* Teams and Score Section */}
        <div className="bg-theme-gray-dark border border-theme-gray-medium rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center my-8 gap-6">
            <div className="flex flex-col items-center text-center md:w-1/3">
              <img 
                src={match.teams[0].logo || '/placeholder.svg'} 
                alt={match.teams[0].name} 
                className="w-24 h-24 object-contain mb-3" 
              />
              <h2 className="text-2xl font-bold text-white">{match.teams[0].name}</h2>
              <div className="mt-2 flex items-center gap-1">
                <div className="text-xs text-theme-green bg-theme-green/10 px-2 py-0.5 rounded-full">
                  Rank #2
                </div>
                <div className="text-xs text-gray-400">Form: W W W L W</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center md:w-1/3">
              <div className="text-4xl font-bold text-white mb-2">VS</div>
              <div className="flex items-center text-gray-400 text-sm">
                {new Date(match.startTime).toLocaleString('en-US', {
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="mt-4 px-4 py-2 border border-theme-purple bg-theme-purple/10 rounded-md">
                <div className="text-sm text-theme-purple">Match starts in</div>
                <div className="text-lg font-medium text-white">12h 30m</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center text-center md:w-1/3">
              <img 
                src={match.teams[1].logo || '/placeholder.svg'} 
                alt={match.teams[1].name} 
                className="w-24 h-24 object-contain mb-3" 
              />
              <h2 className="text-2xl font-bold text-white">{match.teams[1].name}</h2>
              <div className="mt-2 flex items-center gap-1">
                <div className="text-xs text-theme-green bg-theme-green/10 px-2 py-0.5 rounded-full">
                  Rank #4
                </div>
                <div className="text-xs text-gray-400">Form: W L W L W</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs Navigation */}
        <Tabs defaultValue="odds" className="mb-6" onValueChange={setActiveTab}>
          <TabsList className="bg-theme-gray-dark border border-theme-gray-light mb-6 w-full grid grid-cols-3 md:flex md:justify-start p-1">
            <TabsTrigger 
              value="odds" 
              className="px-4 py-2 data-[state=active]:bg-theme-purple data-[state=active]:text-white"
            >
              Odds
            </TabsTrigger>
            <TabsTrigger 
              value="stats" 
              className="px-4 py-2 data-[state=active]:bg-theme-purple data-[state=active]:text-white"
            >
              Stats & H2H
            </TabsTrigger>
            <TabsTrigger 
              value="standings" 
              className="px-4 py-2 data-[state=active]:bg-theme-purple data-[state=active]:text-white"
            >
              Tournament Standings
            </TabsTrigger>
          </TabsList>
          
          {/* Odds Tab Content */}
          <TabsContent value="odds" className="mt-0">
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-4">Betting Odds</h3>
              <p className="text-gray-400 mb-6">
                Compare odds from multiple bookmakers and find the best value for {match.teams[0].name} vs {match.teams[1].name}.
                Click on any odds to go directly to the bookmaker and place your bet.
              </p>
              
              {markets.map((market, index) => (
                <div key={market.name} className="mb-8">
                  <h4 className="text-lg font-medium mb-4">{market.name}</h4>
                  <OddsTable 
                    bookmakerOdds={bookmakerOdds} 
                    markets={[market]} 
                    defaultMarket={market.name}
                  />
                </div>
              ))}
            </div>
          </TabsContent>
          
          {/* Stats Tab Content */}
          <TabsContent value="stats" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Statistics */}
              <Card className="bg-theme-gray-dark border-theme-gray-medium">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4">Team Statistics</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>{match.teams[0].name} Win Rate</span>
                        <span className="font-medium">{team1WinRate}%</span>
                      </div>
                      <Progress value={team1WinRate} className="h-2 bg-theme-gray-medium" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>{match.teams[1].name} Win Rate</span>
                        <span className="font-medium">{team2WinRate}%</span>
                      </div>
                      <Progress value={team2WinRate} className="h-2 bg-theme-gray-medium" />
                    </div>
                    <div className="pt-4">
                      <h4 className="font-medium mb-2">Recent Form</h4>
                      <div className="flex gap-2">
                        <div className="flex gap-1 items-center">
                          <span className="text-sm font-medium">{match.teams[0].name}:</span>
                          <div className="flex gap-1">
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-500 text-xs font-medium">W</span>
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-500 text-xs font-medium">W</span>
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-500 text-xs font-medium">W</span>
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500 text-xs font-medium">L</span>
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-500 text-xs font-medium">W</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <div className="flex gap-1 items-center">
                          <span className="text-sm font-medium">{match.teams[1].name}:</span>
                          <div className="flex gap-1">
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-500 text-xs font-medium">W</span>
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500 text-xs font-medium">L</span>
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-500 text-xs font-medium">W</span>
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500 text-xs font-medium">L</span>
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-500 text-xs font-medium">W</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Head to Head */}
              <Card className="bg-theme-gray-dark border-theme-gray-medium">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4">Head to Head</h3>
                  <div className="mb-4 flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-theme-purple">{recentEncounters.filter(e => e.winner === match.teams[0].name).length}</div>
                      <div className="text-sm text-gray-400">{match.teams[0].name}</div>
                    </div>
                    <Separator orientation="vertical" className="h-12" />
                    <div className="text-center">
                      <div className="text-3xl font-bold text-theme-purple">{recentEncounters.filter(e => e.winner === match.teams[1].name).length}</div>
                      <div className="text-sm text-gray-400">{match.teams[1].name}</div>
                    </div>
                  </div>
                  
                  <h4 className="font-medium mb-2">Recent Matches</h4>
                  <div className="space-y-2">
                    {recentEncounters.map((encounter, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-theme-gray-medium rounded">
                        <div className="text-sm">{new Date(encounter.date).toLocaleDateString()}</div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${encounter.winner === match.teams[0].name ? 'text-theme-green' : 'text-white'}`}>
                            {match.teams[0].name}
                          </span>
                          <span className="text-gray-400">{encounter.score}</span>
                          <span className={`font-medium ${encounter.winner === match.teams[1].name ? 'text-theme-green' : 'text-white'}`}>
                            {match.teams[1].name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Tournament Standings Tab Content */}
          <TabsContent value="standings" className="mt-0">
            <Card className="bg-theme-gray-dark border-theme-gray-medium">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Tournament Standings</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-theme-gray-medium">
                        <th className="pb-2 font-medium text-gray-400">Pos</th>
                        <th className="pb-2 font-medium text-gray-400">Team</th>
                        <th className="pb-2 font-medium text-gray-400">Matches</th>
                        <th className="pb-2 font-medium text-gray-400">W</th>
                        <th className="pb-2 font-medium text-gray-400">L</th>
                        <th className="pb-2 font-medium text-gray-400">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournamentStandings.map((team) => (
                        <tr 
                          key={team.position} 
                          className={`border-b border-theme-gray-medium ${
                            team.team === match.teams[0].name || team.team === match.teams[1].name 
                              ? 'bg-theme-purple/10' 
                              : ''
                          }`}
                        >
                          <td className="py-3">{team.position}</td>
                          <td className="py-3 font-medium">{team.team}</td>
                          <td className="py-3">{team.matches}</td>
                          <td className="py-3">{team.wins}</td>
                          <td className="py-3">{team.losses}</td>
                          <td className="py-3 font-medium">{team.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default MatchDetailsPage;

