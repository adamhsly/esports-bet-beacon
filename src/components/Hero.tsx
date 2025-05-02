
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
  return (
    <div className="relative overflow-hidden py-16 md:py-24">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-theme-dark z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-theme-purple/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-theme-blue/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-gaming mb-6 tracking-tight">
            Find The Best <span className="highlight-gradient">Esports</span><br />
            Betting Sites & <span className="text-theme-green">Bonuses</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Compare odds, bonuses, and features from top esports betting sites.
            Expert reviews and exclusive offers for CS:GO, LoL, Dota 2, and more.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/betting-sites" className="cta-button">
              Compare Betting Sites
              <ArrowRight size={20} />
            </Link>
            
            <Link to="/bonuses" className="bg-transparent hover:bg-theme-gray-medium border border-theme-purple text-white font-medium py-3 px-6 rounded-md transition-all flex items-center justify-center gap-2">
              View Latest Bonuses
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
