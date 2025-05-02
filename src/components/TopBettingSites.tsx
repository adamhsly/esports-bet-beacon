
import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Trophy, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BettingSiteCard } from './BettingSiteCard';

const TopBettingSites = () => {
  const bettingSites = [
    {
      id: 'betsite1',
      name: 'BetMaster',
      logoUrl: 'https://via.placeholder.com/150x60/333333/4ADE80?text=BetMaster',
      rating: 4.9,
      bonus: 'Up to $200 + 50 Free Spins',
      features: ['Live Esports Streaming', '24/7 Customer Support', 'Fast Withdrawals'],
      promoCode: 'ESPORTS100',
      link: '/go/betmaster'
    },
    {
      id: 'betsite2',
      name: 'GG.bet',
      logoUrl: 'https://via.placeholder.com/150x60/333333/8B5CF6?text=GG.bet',
      rating: 4.8,
      bonus: '100% up to $500',
      features: ['Exclusive Esports Odds', 'Mobile App', 'Crypto Payments'],
      promoCode: 'GGBONUS',
      link: '/go/ggbet'
    },
    {
      id: 'betsite3',
      name: 'EsportsBet',
      logoUrl: 'https://via.placeholder.com/150x60/333333/3B82F6?text=EsportsBet',
      rating: 4.7,
      bonus: '$100 Risk-Free First Bet',
      features: ['In-play Betting', 'Tournament Specials', 'Stats Integration'],
      promoCode: 'FREEFIRST',
      link: '/go/esportsbet'
    }
  ];

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2 font-gaming">Top-Rated Esports Betting Sites</h2>
            <p className="text-gray-400">Exclusive bonuses & promotions updated for {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}</p>
          </div>
          <Link to="/betting-sites" className="hidden md:flex items-center text-theme-purple hover:text-theme-blue font-medium">
            View all sites
            <ArrowRight size={18} className="ml-1" />
          </Link>
        </div>
        
        <div className="space-y-6">
          {bettingSites.map((site, index) => (
            <BettingSiteCard 
              key={site.id}
              site={site}
              rank={index + 1}
            />
          ))}
        </div>
        
        <div className="mt-8 text-center md:hidden">
          <Link to="/betting-sites" className="inline-flex items-center text-theme-purple hover:text-theme-blue font-medium">
            View all betting sites
            <ArrowRight size={18} className="ml-1" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TopBettingSites;
