
import React, { useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export interface BookmakerOdds {
  bookmaker: string;
  logo: string;
  odds: Record<string, number | string>;
  link: string;
}

export interface Market {
  name: string;
  options: string[];
}

interface OddsTableProps {
  bookmakerOdds: BookmakerOdds[];
  markets: Market[];
  defaultMarket?: string;
}

export const OddsTable: React.FC<OddsTableProps> = ({ 
  bookmakerOdds, 
  markets, 
  defaultMarket = markets[0]?.name 
}) => {
  const [selectedMarket, setSelectedMarket] = useState(defaultMarket);
  
  // Find the current market being displayed
  const currentMarket = markets.find(m => m.name === selectedMarket) || markets[0];
  
  // Find best odds for each option
  const bestOdds: Record<string, number> = {};
  
  currentMarket?.options.forEach(option => {
    let best = 0;
    bookmakerOdds.forEach(bookmaker => {
      const odd = parseFloat(bookmaker.odds[option] as string) || 0;
      if (odd > best) best = odd;
    });
    bestOdds[option] = best;
  });

  return (
    <div className="bg-theme-gray-dark border border-theme-gray-medium rounded-md p-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">Betting Odds</h3>
        <Select value={selectedMarket} onValueChange={setSelectedMarket}>
          <SelectTrigger className="w-[180px] bg-theme-gray-medium border-theme-gray-light">
            <SelectValue placeholder="Select market" />
          </SelectTrigger>
          <SelectContent className="bg-theme-gray-dark border-theme-gray-light">
            {markets.map(market => (
              <SelectItem key={market.name} value={market.name}>
                {market.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-theme-gray-medium">
              <TableHead className="text-gray-300">Bookmaker</TableHead>
              {currentMarket?.options.map(option => (
                <TableHead key={option} className="text-gray-300 text-center">
                  {option}
                </TableHead>
              ))}
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookmakerOdds.map((bookmaker) => (
              <TableRow key={bookmaker.bookmaker} className="border-theme-gray-medium">
                <TableCell className="font-medium flex items-center gap-2">
                  <img 
                    src={bookmaker.logo || '/placeholder.svg'} 
                    alt={bookmaker.bookmaker} 
                    className="w-6 h-6 object-contain"
                  />
                  {bookmaker.bookmaker}
                </TableCell>
                
                {currentMarket?.options.map(option => {
                  const odd = bookmaker.odds[option];
                  const isBestOdds = parseFloat(odd as string) === bestOdds[option];
                  
                  return (
                    <TableCell 
                      key={option} 
                      className={`text-center ${isBestOdds ? 'text-theme-green font-bold' : ''}`}
                    >
                      {odd}
                    </TableCell>
                  );
                })}
                
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-theme-purple hover:text-theme-purple hover:bg-theme-purple/10"
                    onClick={() => window.open(bookmaker.link, '_blank')}
                  >
                    Bet <ArrowRight size={14} className="ml-1" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
