
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Radio, MapPin } from 'lucide-react';

interface PandaScoreLiveMatchHeaderProps {
  match: {
    id: string;
    teams: Array<{
      name: string;
      logo?: string;
      id?: string;
    }>;
    startTime: string;
    tournament?: string;
    esportType: string;
    bestOf?: number;
    status: string;
    rawData?: any;
  };
}

export const PandaScoreLiveMatchHeader: React.FC<PandaScoreLiveMatchHeaderProps> = ({ match }) => {
  const team1 = match.teams[0] || { name: 'Team 1' };
  const team2 = match.teams[1] || { name: 'Team 2' };

  const formatPrizePool = (prizePool: number | string) => {
    console.log('🎯 Live Match Prize pool raw data:', prizePool, typeof prizePool);
    
    if (!prizePool) return null;
    
    let amount: number;
    
    if (typeof prizePool === 'string') {
      // Extract numbers from strings like "10000 United States Dollar"
      const numberMatch = prizePool.match(/\d+/);
      if (!numberMatch) return null;
      amount = parseInt(numberMatch[0]);
    } else {
      amount = prizePool;
    }
    
    console.log('🎯 Live Match Parsed prize pool amount:', amount);
    
    if (isNaN(amount) || amount <= 0) return null;
    
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${amount}`;
    }
  };

  const getTournamentInfo = () => {
    const rawData = match.rawData;
    let prizePool = null;
    let tier = null;

    console.log('🎯 Live Match Raw data for tournament info:', rawData);

    if (rawData?.tournament) {
      prizePool = rawData.tournament.prizepool;
      tier = rawData.tournament.tier;
      console.log('🎯 Live Match Tournament prize pool:', prizePool, 'tier:', tier);
    }
    
    if (rawData?.league && !prizePool) {
      prizePool = rawData.league.prizepool;
      tier = tier || rawData.league.tier;
      console.log('🎯 Live Match League prize pool:', prizePool, 'tier:', tier);
    }

    return { prizePool, tier };
  };

  const { prizePool, tier } = getTournamentInfo();
  const formattedPrizePool = formatPrizePool(prizePool);

  console.log('🎯 Live Match Final formatted prize pool:', formattedPrizePool);

  return (
    <Card className="bg-theme-gray-dark border-theme-gray-medium overflow-hidden border-l-4 border-l-red-500">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="flex items-center">
                <Trophy className="h-4 w-4 mr-2" />
                <span>{match.tournament || 'Professional Match'}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span className="uppercase">{match.esportType}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {formattedPrizePool && (
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-400/30 text-xs">
                  <Trophy size={10} className="mr-1" />
                  {formattedPrizePool}
                </Badge>
              )}
              {tier && tier !== 'unranked' && (
                <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-400/30 text-xs">
                  {tier.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
          
          <Badge className="bg-red-500 text-white animate-pulse">
            <Radio className="h-3 w-3 mr-1" />
            LIVE
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-8 items-center">
          <div className="text-center">
            <img 
              src={team1.logo || '/placeholder.svg'} 
              alt={team1.name} 
              className="w-20 h-20 object-contain mx-auto mb-4 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <h3 className="text-xl font-bold text-white">{team1.name}</h3>
          </div>
          
          <div className="text-center">
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400 mb-2">LIVE</div>
              <div className="text-sm text-gray-400">Best of {match.bestOf || 3}</div>
            </div>
          </div>
          
          <div className="text-center">
            <img 
              src={team2.logo || '/placeholder.svg'} 
              alt={team2.name} 
              className="w-20 h-20 object-contain mx-auto mb-4 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <h3 className="text-xl font-bold text-white">{team2.name}</h3>
          </div>
        </div>
      </div>
    </Card>
  );
};
