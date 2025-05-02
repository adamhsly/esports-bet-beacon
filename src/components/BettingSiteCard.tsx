
import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowRight, Trophy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BettingSite {
  id: string;
  name: string;
  logoUrl: string;
  rating: number;
  bonus: string;
  features: string[];
  promoCode: string;
  link: string;
}

interface BettingSiteCardProps {
  site: BettingSite;
  rank: number;
}

export const BettingSiteCard: React.FC<BettingSiteCardProps> = ({ site, rank }) => {
  return (
    <div className="betting-site-card">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Rank */}
        <div className="hidden md:flex md:col-span-1 justify-center">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
            rank === 1 ? "bg-theme-green text-black" : "bg-theme-gray-medium text-white"
          )}>
            {rank}
          </div>
        </div>
        
        {/* Logo */}
        <div className="md:col-span-2 flex justify-center md:justify-start">
          <img 
            src={site.logoUrl} 
            alt={site.name} 
            className="h-12 object-contain"
          />
        </div>
        
        {/* Rating */}
        <div className="hidden md:block md:col-span-1">
          <div className="flex items-center">
            <Star className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" />
            <span className="font-medium">{site.rating}</span>
          </div>
        </div>
        
        {/* Bonus */}
        <div className="md:col-span-3">
          <div className="md:hidden flex justify-between items-center mb-2">
            <div className="flex items-center">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mr-2",
                rank === 1 ? "bg-theme-green text-black" : "bg-theme-gray-medium text-white"
              )}>
                {rank}
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" />
                <span className="font-medium">{site.rating}</span>
              </div>
            </div>
          </div>
          <h3 className="font-medium text-white mb-1">{site.name}</h3>
          <p className="text-theme-green text-sm font-medium">{site.bonus}</p>
        </div>
        
        {/* Features */}
        <div className="hidden md:block md:col-span-3">
          <ul className="space-y-1">
            {site.features.map((feature, index) => (
              <li key={index} className="flex items-center text-sm text-gray-300">
                <Check className="w-4 h-4 mr-1 text-theme-purple flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        
        {/* CTA */}
        <div className="md:col-span-2">
          <Link
            to={site.link}
            className="block w-full bg-theme-green text-black font-bold py-2 px-4 rounded-md hover:brightness-110 transition-all font-gaming text-center mb-2"
          >
            Claim Bonus
          </Link>
          <div className="text-xs text-gray-400 text-center">
            Promo Code: <span className="font-medium text-white">{site.promoCode}</span>
          </div>
        </div>
      </div>
      
      {/* Mobile Features */}
      <div className="md:hidden mt-4 pt-4 border-t border-theme-gray-light">
        <ul className="grid grid-cols-2 gap-2">
          {site.features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm text-gray-300">
              <Check className="w-4 h-4 mr-1 text-theme-purple flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
